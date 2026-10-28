from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.role import Role, UserRole
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_assignment import TeacherAssignment
from app.models.audit_log import AuditLog
from app.core.security import get_password_hash
from app.core.exceptions import ConflictException, ResourceNotFoundException, PermissionDeniedException
from app.schemas.teacher import TeacherCreate, TeacherProfileResponse, TeacherListItem, TeacherAssignmentDetail

class TeacherService:
    @staticmethod
    def list_teachers(
        db: Session,
        school_id: int,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[List[TeacherListItem], int]:
        query = (
            db.query(TeacherProfile)
            .join(User, TeacherProfile.user_id == User.id)
            .filter(TeacherProfile.school_id == school_id, TeacherProfile.is_active.is_(True))
        )

        total = query.count()
        offset = (page - 1) * limit
        teachers = query.offset(offset).limit(limit).all()

        items = []
        for t in teachers:
            assignment_count = len(t.assignments)
            items.append(
                TeacherListItem(
                    id=t.id,
                    employee_id=t.employee_id,
                    full_name=t.user.full_name if t.user else "Teacher",
                    email=t.user.email if t.user else "",
                    designation=t.designation,
                    department=t.department,
                    employment_status=t.employment_status,
                    assigned_classes_count=assignment_count,
                )
            )

        return items, total

    @staticmethod
    def get_teacher_by_id(db: Session, teacher_id: int) -> TeacherProfileResponse:
        teacher = db.query(TeacherProfile).filter(TeacherProfile.id == teacher_id).first()
        if not teacher:
            raise ResourceNotFoundException("Teacher profile not found.")

        assignments_detail = []
        for a in teacher.assignments:
            if a.class_ and a.section and a.academic_year:
                assignments_detail.append(
                    TeacherAssignmentDetail(
                        id=a.id,
                        academic_year_id=a.academic_year_id,
                        academic_year_name=a.academic_year.name,
                        class_id=a.class_id,
                        class_name=a.class_.name,
                        section_id=a.section_id,
                        section_name=a.section.name,
                        subject_name=a.subject_name,
                        role_type=a.role_type,
                    )
                )

        return TeacherProfileResponse(
            id=teacher.id,
            user_id=teacher.user_id,
            employee_id=teacher.employee_id,
            full_name=teacher.user.full_name if teacher.user else "",
            email=teacher.user.email if teacher.user else "",
            designation=teacher.designation,
            department=teacher.department,
            qualification=teacher.qualification,
            joining_date=teacher.joining_date,
            employment_status=teacher.employment_status,
            is_active=teacher.is_active,
            assignments=assignments_detail,
            created_at=teacher.created_at,
        )

    @staticmethod
    def create_teacher(db: Session, school_id: int, data: TeacherCreate, admin_user_id: int) -> TeacherProfile:
        # 1. Check employee_id uniqueness
        existing_emp = (
            db.query(TeacherProfile)
            .filter(TeacherProfile.school_id == school_id, TeacherProfile.employee_id == data.employee_id)
            .first()
        )
        if existing_emp:
            raise ConflictException(f"Employee ID '{data.employee_id}' is already registered.")

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
            is_active=True,
        )
        db.add(user)
        db.flush()

        # 4. Attach TEACHER role
        teacher_role = db.query(Role).filter(Role.name == "TEACHER").first()
        if not teacher_role:
            teacher_role = Role(name="TEACHER", description="Teacher Role")
            db.add(teacher_role)
            db.flush()

        db.add(UserRole(user_id=user.id, role_id=teacher_role.id))

        # 5. Create TeacherProfile
        teacher_profile = TeacherProfile(
            user_id=user.id,
            school_id=school_id,
            employee_id=data.employee_id,
            designation=data.designation,
            department=data.department,
            qualification=data.qualification,
            joining_date=data.joining_date,
            employment_status="active",
            is_active=True,
        )
        db.add(teacher_profile)

        # 6. Audit log
        db.add(AuditLog(
            school_id=school_id,
            user_id=admin_user_id,
            action="CREATE_TEACHER",
            resource_type="TeacherProfile",
            resource_id=data.employee_id,
            details=f"Registered teacher {data.full_name} ({data.employee_id})"
        ))

        db.commit()
        db.refresh(teacher_profile)
        return teacher_profile
