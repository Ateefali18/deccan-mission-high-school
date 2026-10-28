from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.school import School
from app.models.academic_year import AcademicYear
from app.models.class_model import Class
from app.models.section import Section
from app.models.user import User
from app.models.role import Role, UserRole
from app.models.student_profile import StudentProfile
from app.models.student_enrollment import StudentEnrollment
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_assignment import TeacherAssignment
from app.models.audit_log import AuditLog
from app.core.security import get_password_hash
from app.core.exceptions import ConflictException, ResourceNotFoundException
from app.schemas.academic_year import AcademicYearCreate
from app.schemas.class_section import ClassCreate, SectionCreate
from app.schemas.student import StudentCreate
from app.schemas.teacher import TeacherCreate

class SchoolService:
    @staticmethod
    def get_or_create_school(db: Session, name: str, code: str) -> School:
        school = db.query(School).filter(School.code == code).first()
        if not school:
            school = School(
                name=name,
                code=code,
                timezone="Asia/Kolkata",
                contact_email="admin@deccanmission.edu.in",
                contact_phone="+91 40 2456 7890",
                address="Old City, Hyderabad, Telangana 500002, India",
                affiliation_number="TS-HYD-CBSE-41092",
            )
            db.add(school)
            db.commit()
            db.refresh(school)
        return school

    @staticmethod
    def list_academic_years(db: Session, school_id: int) -> List[AcademicYear]:
        return (
            db.query(AcademicYear)
            .filter(AcademicYear.school_id == school_id)
            .order_by(AcademicYear.start_date.desc())
            .all()
        )

    @staticmethod
    def create_academic_year(db: Session, school_id: int, data: AcademicYearCreate, user_id: int) -> AcademicYear:
        existing = (
            db.query(AcademicYear)
            .filter(AcademicYear.school_id == school_id, AcademicYear.name == data.name)
            .first()
        )
        if existing:
            raise ConflictException(f"Academic year '{data.name}' already exists.")

        if data.is_current:
            # Set all other academic years to is_current=False
            db.query(AcademicYear).filter(AcademicYear.school_id == school_id).update({"is_current": False})

        new_year = AcademicYear(
            school_id=school_id,
            name=data.name,
            start_date=data.start_date,
            end_date=data.end_date,
            is_current=data.is_current,
            status=data.status,
        )
        db.add(new_year)
        
        # Audit log
        db.add(AuditLog(
            school_id=school_id,
            user_id=user_id,
            action="CREATE_ACADEMIC_YEAR",
            resource_type="AcademicYear",
            resource_id=data.name,
            details=f"Created academic year {data.name}"
        ))
        db.commit()
        db.refresh(new_year)
        return new_year

    @staticmethod
    def list_classes(db: Session, school_id: int) -> List[Class]:
        return (
            db.query(Class)
            .filter(Class.school_id == school_id, Class.is_active.is_(True))
            .order_by(Class.grade_level.asc(), Class.name.asc())
            .all()
        )

    @staticmethod
    def create_class(db: Session, school_id: int, data: ClassCreate, user_id: int) -> Class:
        existing = (
            db.query(Class)
            .filter(Class.school_id == school_id, Class.name == data.name)
            .first()
        )
        if existing:
            raise ConflictException(f"Class '{data.name}' already exists in this school.")

        new_class = Class(
            school_id=school_id,
            name=data.name,
            grade_level=data.grade_level,
            stream=data.stream,
            is_active=data.is_active,
        )
        db.add(new_class)
        db.flush()

        # Automatically create default Section 'A' for convenience
        default_section = Section(
            class_id=new_class.id,
            name="A",
            capacity=40,
            is_active=True,
        )
        db.add(default_section)

        db.add(AuditLog(
            school_id=school_id,
            user_id=user_id,
            action="CREATE_CLASS",
            resource_type="Class",
            resource_id=str(new_class.id),
            details=f"Created class {new_class.name} with default section A"
        ))
        db.commit()
        db.refresh(new_class)
        return new_class

    @staticmethod
    def create_section(db: Session, class_id: int, data: SectionCreate, user_id: int) -> Section:
        cls = db.query(Class).filter(Class.id == class_id).first()
        if not cls:
            raise ResourceNotFoundException("Class not found.")

        existing = (
            db.query(Section)
            .filter(Section.class_id == class_id, Section.name == data.name)
            .first()
        )
        if existing:
            raise ConflictException(f"Section '{data.name}' already exists for {cls.name}.")

        new_section = Section(
            class_id=class_id,
            name=data.name,
            room_number=data.room_number,
            capacity=data.capacity,
            is_active=data.is_active,
        )
        db.add(new_section)
        db.add(AuditLog(
            school_id=cls.school_id,
            user_id=user_id,
            action="CREATE_SECTION",
            resource_type="Section",
            resource_id=data.name,
            details=f"Created section {data.name} for class {cls.name}"
        ))
        db.commit()
        db.refresh(new_section)
        return new_section
