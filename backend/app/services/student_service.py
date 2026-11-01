from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User
from app.models.role import Role, UserRole
from app.models.student_profile import StudentProfile
from app.models.student_enrollment import StudentEnrollment
from app.models.academic_year import AcademicYear
from app.models.class_model import Class
from app.models.section import Section
from app.models.audit_log import AuditLog
from app.core.security import get_password_hash
from app.core.exceptions import ConflictException, ResourceNotFoundException, PermissionDeniedException
from app.schemas.student import StudentCreate, StudentUpdate, StudentProfileResponse, StudentListItem, EnrollmentDetail
from app.permissions.rules import PermissionService

class StudentService:
    @staticmethod
    def list_students(
        db: Session,
        school_id: int,
        page: int = 1,
        limit: int = 20,
        class_id: Optional[int] = None,
        section_id: Optional[int] = None,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[StudentListItem], int]:
        query = (
            db.query(StudentProfile)
            .join(User, StudentProfile.user_id == User.id)
            .filter(StudentProfile.school_id == school_id)
        )

        if status == "active":
            query = query.filter(StudentProfile.is_active.is_(True))
        elif status == "inactive":
            query = query.filter(StudentProfile.is_active.is_(False))
        elif status and status != "all":
            query = query.filter(StudentProfile.student_status == status)

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(
                (StudentProfile.admission_number.ilike(term))
                | (User.full_name.ilike(term))
                | (User.email.ilike(term))
                | (StudentProfile.guardian_name.ilike(term))
            )

        if section_id or class_id:
            query = query.join(StudentEnrollment, StudentEnrollment.student_id == StudentProfile.id)
            if class_id:
                query = query.filter(StudentEnrollment.class_id == class_id)
            if section_id:
                query = query.filter(StudentEnrollment.section_id == section_id)

        total = query.count()
        offset = (page - 1) * limit
        students = query.order_by(StudentProfile.id.asc()).offset(offset).limit(limit).all()

        items = []
        for s in students:
            enrollment = (
                db.query(StudentEnrollment)
                .filter(StudentEnrollment.student_id == s.id)
                .order_by(StudentEnrollment.id.desc())
                .first()
            )
            items.append(
                StudentListItem(
                    id=s.id,
                    admission_number=s.admission_number,
                    full_name=s.user.full_name if s.user else "Student",
                    email=s.user.email if s.user else "",
                    class_name=enrollment.class_.name if enrollment and enrollment.class_ else None,
                    section_name=enrollment.section.name if enrollment and enrollment.section else None,
                    roll_number=enrollment.roll_number if enrollment else None,
                    student_status=s.student_status,
                )
            )

        return items, total

    @staticmethod
    def get_student_by_id(db: Session, current_user: User, student_id: int) -> StudentProfileResponse:
        # Enforce permission
        if not PermissionService.can_access_student_record(db, current_user, student_id):
            raise PermissionDeniedException("Access denied: You do not have permission to view this student profile.")

        student = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
        if not student:
            raise ResourceNotFoundException("Student profile not found.")

        enrollment = (
            db.query(StudentEnrollment)
            .filter(StudentEnrollment.student_id == student.id)
            .order_by(StudentEnrollment.id.desc())
            .first()
        )

        enrollment_detail = None
        if enrollment and enrollment.class_ and enrollment.section and enrollment.academic_year:
            enrollment_detail = EnrollmentDetail(
                id=enrollment.id,
                academic_year_id=enrollment.academic_year_id,
                academic_year_name=enrollment.academic_year.name,
                class_id=enrollment.class_id,
                class_name=enrollment.class_.name,
                section_id=enrollment.section_id,
                section_name=enrollment.section.name,
                roll_number=enrollment.roll_number,
                enrollment_status=enrollment.enrollment_status,
            )

        return StudentProfileResponse(
            id=student.id,
            user_id=student.user_id,
            admission_number=student.admission_number,
            full_name=student.user.full_name if student.user else "",
            email=student.user.email if student.user else "",
            gender=student.gender,
            date_of_birth=student.date_of_birth,
            blood_group=student.blood_group,
            guardian_name=student.guardian_name,
            guardian_phone=student.guardian_phone,
            address=student.address,
            student_status=student.student_status,
            is_active=student.is_active,
            current_enrollment=enrollment_detail,
            created_at=student.created_at,
        )

    @staticmethod
    def create_student(db: Session, school_id: int, data: StudentCreate, admin_user_id: int) -> StudentProfile:
        # 1. Check admission number uniqueness
        existing_adm = (
            db.query(StudentProfile)
            .filter(StudentProfile.school_id == school_id, StudentProfile.admission_number == data.admission_number)
            .first()
        )
        if existing_adm:
            raise ConflictException(f"Admission number '{data.admission_number}' is already registered.")

        # 2. Check username / email uniqueness
        existing_user = (
            db.query(User)
            .filter(User.school_id == school_id, (User.username == data.username) | (User.email == data.email))
            .first()
        )
        if existing_user:
            raise ConflictException("A user with this username or email already exists in this school.")

        # 3. Create User account
        user = User(
            school_id=school_id,
            username=data.username,
            email=data.email,
            hashed_password=get_password_hash(data.password),
            full_name=data.full_name,
            phone_number=data.guardian_phone,
            is_active=True,
        )
        db.add(user)
        db.flush()

        # 4. Attach STUDENT role
        student_role = db.query(Role).filter(Role.name == "STUDENT").first()
        if not student_role:
            student_role = Role(name="STUDENT", description="Student Role")
            db.add(student_role)
            db.flush()

        db.add(UserRole(user_id=user.id, role_id=student_role.id))

        # 5. Create StudentProfile
        student_profile = StudentProfile(
            user_id=user.id,
            school_id=school_id,
            admission_number=data.admission_number,
            gender=data.gender,
            date_of_birth=data.date_of_birth,
            blood_group=data.blood_group,
            guardian_name=data.guardian_name,
            guardian_phone=data.guardian_phone,
            address=data.address,
            student_status="active",
            is_active=True,
        )
        db.add(student_profile)
        db.flush()

        # 6. Create StudentEnrollment
        enrollment = StudentEnrollment(
            student_id=student_profile.id,
            academic_year_id=data.academic_year_id,
            class_id=data.class_id,
            section_id=data.section_id,
            roll_number=data.roll_number,
            enrollment_status="enrolled",
        )
        db.add(enrollment)

        # 7. Audit log
        db.add(AuditLog(
            school_id=school_id,
            user_id=admin_user_id,
            action="CREATE_STUDENT",
            resource_type="StudentProfile",
            resource_id=data.admission_number,
            details=f"Registered student {data.full_name} ({data.admission_number})"
        ))

        db.commit()
        db.refresh(student_profile)
        return student_profile

    @staticmethod
    def update_student(db: Session, student_id: int, data: StudentUpdate, admin_user_id: int) -> StudentProfile:
        student = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
        if not student:
            raise ResourceNotFoundException("Student profile not found.")

        # Update User details
        if student.user:
            if data.full_name is not None:
                student.user.full_name = data.full_name
            if data.email is not None and data.email != student.user.email:
                existing_email = db.query(User).filter(User.school_id == student.school_id, User.email == data.email, User.id != student.user.id).first()
                if existing_email:
                    raise ConflictException("Email already in use.")
                student.user.email = data.email
            if data.guardian_phone is not None:
                student.user.phone_number = data.guardian_phone
            if data.is_active is not None:
                student.user.is_active = data.is_active

        # Update StudentProfile fields
        if data.gender is not None:
            student.gender = data.gender
        if data.date_of_birth is not None:
            student.date_of_birth = data.date_of_birth
        if data.blood_group is not None:
            student.blood_group = data.blood_group
        if data.guardian_name is not None:
            student.guardian_name = data.guardian_name
        if data.guardian_phone is not None:
            student.guardian_phone = data.guardian_phone
        if data.address is not None:
            student.address = data.address
        if data.student_status is not None:
            student.student_status = data.student_status
        if data.is_active is not None:
            student.is_active = data.is_active

        # Update or create Enrollment if class/section/academic_year passed
        if data.class_id or data.section_id or data.roll_number:
            enrollment = (
                db.query(StudentEnrollment)
                .filter(StudentEnrollment.student_id == student.id)
                .order_by(StudentEnrollment.id.desc())
                .first()
            )
            if enrollment:
                if data.class_id:
                    enrollment.class_id = data.class_id
                if data.section_id:
                    enrollment.section_id = data.section_id
                if data.academic_year_id:
                    enrollment.academic_year_id = data.academic_year_id
                if data.roll_number is not None:
                    enrollment.roll_number = data.roll_number
            elif data.class_id and data.section_id and data.academic_year_id:
                new_enr = StudentEnrollment(
                    student_id=student.id,
                    academic_year_id=data.academic_year_id,
                    class_id=data.class_id,
                    section_id=data.section_id,
                    roll_number=data.roll_number,
                    enrollment_status="enrolled",
                )
                db.add(new_enr)

        db.add(AuditLog(
            school_id=student.school_id,
            user_id=admin_user_id,
            action="UPDATE_STUDENT",
            resource_type="StudentProfile",
            resource_id=student.admission_number,
            details=f"Updated student {student.admission_number}"
        ))
        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def deactivate_student(db: Session, student_id: int, admin_user_id: int) -> StudentProfile:
        student = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
        if not student:
            raise ResourceNotFoundException("Student profile not found.")
        student.is_active = False
        student.student_status = "inactive"
        if student.user:
            student.user.is_active = False

        db.add(AuditLog(
            school_id=student.school_id,
            user_id=admin_user_id,
            action="DEACTIVATE_STUDENT",
            resource_type="StudentProfile",
            resource_id=student.admission_number,
            details=f"Deactivated student {student.admission_number}"
        ))
        db.commit()
        db.refresh(student)
        return student
