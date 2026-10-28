from typing import List
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.student_profile import StudentProfile
from app.models.teacher_profile import TeacherProfile
from app.models.student_enrollment import StudentEnrollment
from app.schemas.search import SearchResultItem, SearchResponse

class SearchService:
    @staticmethod
    def search(db: Session, current_user: User, query_text: str, limit: int = 15) -> SearchResponse:
        q = query_text.strip()
        if not q or len(q) < 2:
            return SearchResponse(query=query_text, total=0, results=[])

        results: List[SearchResultItem] = []
        user_roles = current_user.roles
        school_id = current_user.school_id

        # 1. Search Students (Admins, and Teachers for authorized students)
        if "ADMIN" in user_roles or "TEACHER" in user_roles:
            student_query = (
                db.query(StudentProfile)
                .join(User, StudentProfile.user_id == User.id)
                .filter(
                    StudentProfile.school_id == school_id,
                    StudentProfile.is_active.is_(True),
                    or_(
                        StudentProfile.admission_number.ilike(f"%{q}%"),
                        User.full_name.ilike(f"%{q}%"),
                        User.username.ilike(f"%{q}%"),
                    )
                )
            )

            # If teacher, only search within their assigned sections/classes
            if "TEACHER" in user_roles and "ADMIN" not in user_roles:
                if current_user.teacher_profile:
                    teacher_id = current_user.teacher_profile.id
                    student_query = (
                        student_query
                        .join(StudentEnrollment, StudentEnrollment.student_id == StudentProfile.id)
                        .filter(
                            StudentEnrollment.section_id.in_(
                                db.query(TeacherAssignment.section_id).filter(
                                    TeacherAssignment.teacher_id == teacher_id,
                                    TeacherAssignment.is_active.is_(True)
                                )
                            )
                        )
                    )
                else:
                    student_query = student_query.filter(False)

            students = student_query.limit(limit).all()

            for s in students:
                # Get current enrollment
                enrollment = (
                    db.query(StudentEnrollment)
                    .filter(StudentEnrollment.student_id == s.id)
                    .order_by(StudentEnrollment.id.desc())
                    .first()
                )
                subtitle = "Student"
                if enrollment and enrollment.class_ and enrollment.section:
                    subtitle = f"{enrollment.class_.name} - Sec {enrollment.section.name}"

                results.append(
                    SearchResultItem(
                        id=s.id,
                        type="student",
                        identifier=s.admission_number,
                        title=s.user.full_name if s.user else "Student",
                        subtitle=subtitle,
                        metadata={
                            "admission_number": s.admission_number,
                            "status": s.student_status,
                            "email": s.user.email if s.user else "",
                        }
                    )
                )

        # 2. Search Teachers (Admins, Teachers, and Students can find faculty)
        teacher_query = (
            db.query(TeacherProfile)
            .join(User, TeacherProfile.user_id == User.id)
            .filter(
                TeacherProfile.school_id == school_id,
                TeacherProfile.is_active.is_(True),
                or_(
                    TeacherProfile.employee_id.ilike(f"%{q}%"),
                    User.full_name.ilike(f"%{q}%"),
                    TeacherProfile.department.ilike(f"%{q}%"),
                )
            )
        )

        teachers = teacher_query.limit(limit).all()
        for t in teachers:
            dept = t.department or "General Faculty"
            results.append(
                SearchResultItem(
                    id=t.id,
                    type="teacher",
                    identifier=t.employee_id,
                    title=t.user.full_name if t.user else "Faculty",
                    subtitle=f"{t.designation} • {dept}",
                    metadata={
                        "employee_id": t.employee_id,
                        "department": t.department,
                        "email": t.user.email if t.user else "",
                    }
                )
            )

        # Slice results to requested limit
        bounded_results = results[:limit]
        return SearchResponse(query=query_text, total=len(bounded_results), results=bounded_results)
