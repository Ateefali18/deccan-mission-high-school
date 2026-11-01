from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.role import Role, UserRole
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_assignment import TeacherAssignment
from app.models.audit_log import AuditLog
from app.core.security import get_password_hash
from app.core.exceptions import ConflictException, ResourceNotFoundException, PermissionDeniedException
from app.schemas.teacher import TeacherCreate, TeacherUpdate, TeacherProfileResponse, TeacherListItem, TeacherAssignmentDetail

class TeacherService:
    @staticmethod
    def list_teachers(
        db: Session,
        school_id: int,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[List[TeacherListItem], int]:
        query = (
            db.query(TeacherProfile)
            .join(User, TeacherProfile.user_id == User.id)
            .filter(TeacherProfile.school_id == school_id)
        )

        if status == "active":
            query = query.filter(TeacherProfile.is_active.is_(True))
        elif status == "inactive":
            query = query.filter(TeacherProfile.is_active.is_(False))

        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.filter(
                (TeacherProfile.employee_id.ilike(term))
                | (User.full_name.ilike(term))
                | (User.email.ilike(term))
                | (TeacherProfile.designation.ilike(term))
                | (TeacherProfile.department.ilike(term))
            )

        total = query.count()
        offset = (page - 1) * limit
        teachers = query.order_by(TeacherProfile.id.asc()).offset(offset).limit(limit).all()

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

    @staticmethod
    def update_teacher(db: Session, teacher_id: int, data: TeacherUpdate, admin_user_id: int) -> TeacherProfile:
        teacher = db.query(TeacherProfile).filter(TeacherProfile.id == teacher_id).first()
        if not teacher:
            raise ResourceNotFoundException("Teacher profile not found.")

        # Update User details
        if teacher.user:
            if data.full_name is not None:
                teacher.user.full_name = data.full_name
            if data.email is not None and data.email != teacher.user.email:
                existing_email = db.query(User).filter(User.school_id == teacher.school_id, User.email == data.email, User.id != teacher.user.id).first()
                if existing_email:
                    raise ConflictException("Email already in use.")
                teacher.user.email = data.email
            if data.contact_phone is not None:
                teacher.user.phone_number = data.contact_phone
            elif data.phone_number is not None:
                teacher.user.phone_number = data.phone_number
            if data.is_active is not None:
                teacher.user.is_active = data.is_active

        # Update TeacherProfile details
        if data.designation is not None:
            teacher.designation = data.designation
        if data.department is not None:
            teacher.department = data.department
        if data.qualification is not None:
            teacher.qualification = data.qualification
        if data.specialization is not None:
            teacher.designation = data.specialization
        if data.is_active is not None:
            teacher.is_active = data.is_active
            teacher.employment_status = "active" if data.is_active else "inactive"
        if data.employment_status is not None:
            teacher.employment_status = data.employment_status
            if data.employment_status in ["resigned", "retired", "inactive"]:
                teacher.is_active = False
                if teacher.user:
                    teacher.user.is_active = False

        db.add(AuditLog(
            school_id=teacher.school_id,
            user_id=admin_user_id,
            action="UPDATE_TEACHER",
            resource_type="TeacherProfile",
            resource_id=teacher.employee_id,
            details=f"Updated teacher {teacher.employee_id}"
        ))
        db.commit()
        db.refresh(teacher)
        return teacher

    @staticmethod
    def deactivate_teacher(db: Session, teacher_id: int, admin_user_id: int) -> TeacherProfile:
        teacher = db.query(TeacherProfile).filter(TeacherProfile.id == teacher_id).first()
        if not teacher:
            raise ResourceNotFoundException("Teacher profile not found.")
        teacher.is_active = False
        teacher.employment_status = "inactive"
        if teacher.user:
            teacher.user.is_active = False

        db.add(AuditLog(
            school_id=teacher.school_id,
            user_id=admin_user_id,
            action="DEACTIVATE_TEACHER",
            resource_type="TeacherProfile",
            resource_id=teacher.employee_id,
            details=f"Deactivated teacher {teacher.employee_id}"
        ))
        db.commit()
        db.refresh(teacher)
        return teacher
