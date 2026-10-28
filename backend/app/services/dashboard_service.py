from typing import Optional
from sqlalchemy import func, distinct
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.student_profile import StudentProfile
from app.models.teacher_profile import TeacherProfile
from app.models.class_model import Class
from app.models.section import Section
from app.models.academic_year import AcademicYear
from app.models.student_enrollment import StudentEnrollment
from app.models.teacher_assignment import TeacherAssignment
from app.models.audit_log import AuditLog
from app.schemas.dashboard import (
    AdminDashboardStats,
    TeacherDashboardStats,
    StudentDashboardStats,
    ActivityLogItem
)

class DashboardService:
    @staticmethod
    def get_admin_dashboard(db: Session, school_id: int) -> AdminDashboardStats:
        # 1. Total active students
        total_students = (
            db.query(func.count(StudentProfile.id))
            .filter(
                StudentProfile.school_id == school_id,
                StudentProfile.is_active.is_(True),
                StudentProfile.student_status == "active"
            )
            .scalar() or 0
        )

        # 2. Total active teachers
        total_teachers = (
            db.query(func.count(TeacherProfile.id))
            .filter(
                TeacherProfile.school_id == school_id,
                TeacherProfile.is_active.is_(True),
                TeacherProfile.employment_status == "active"
            )
            .scalar() or 0
        )

        # 3. Total classes
        total_classes = (
            db.query(func.count(Class.id))
            .filter(Class.school_id == school_id, Class.is_active.is_(True))
            .scalar() or 0
        )

        # 4. Total sections
        total_sections = (
            db.query(func.count(Section.id))
            .join(Class, Section.class_id == Class.id)
            .filter(Class.school_id == school_id, Section.is_active.is_(True))
            .scalar() or 0
        )

        # 5. Current academic year
        current_year = (
            db.query(AcademicYear)
            .filter(AcademicYear.school_id == school_id, AcademicYear.is_current.is_(True))
            .first()
        )
        if not current_year:
            current_year = (
                db.query(AcademicYear)
                .filter(AcademicYear.school_id == school_id)
                .order_by(AcademicYear.id.desc())
                .first()
            )

        # 6. Recent activity from AuditLog
        recent_logs = (
            db.query(AuditLog)
            .filter(AuditLog.school_id == school_id)
            .order_by(AuditLog.created_at.desc())
            .limit(6)
            .all()
        )

        activity_items = [
            ActivityLogItem(
                id=log.id,
                action=log.action,
                resource_type=log.resource_type,
                details=log.details,
                created_at=log.created_at,
                user_name=log.user.full_name if log.user else "System",
            )
            for log in recent_logs
        ]

        return AdminDashboardStats(
            total_active_students=total_students,
            total_active_teachers=total_teachers,
            total_classes=total_classes,
            total_sections=total_sections,
            current_academic_year=current_year.name if current_year else "Not Configured",
            current_academic_year_id=current_year.id if current_year else None,
            recent_activity=activity_items,
        )

    @staticmethod
    def get_teacher_dashboard(db: Session, current_user: User) -> TeacherDashboardStats:
        teacher = current_user.teacher_profile
        if not teacher:
            return TeacherDashboardStats(
                teacher_name=current_user.full_name,
                employee_id="N/A",
                designation="Faculty",
                total_assigned_classes=0,
                total_authorized_students=0,
                assigned_subjects=[],
            )

        current_year = (
            db.query(AcademicYear)
            .filter(AcademicYear.school_id == current_user.school_id, AcademicYear.is_current.is_(True))
            .first()
        )

        assignments_query = db.query(TeacherAssignment).filter(
            TeacherAssignment.teacher_id == teacher.id,
            TeacherAssignment.is_active.is_(True)
        )
        if current_year:
            assignments_query = assignments_query.filter(TeacherAssignment.academic_year_id == current_year.id)
        
        assignments = assignments_query.all()

        section_ids = [a.section_id for a in assignments]
        distinct_classes = len(set(a.class_id for a in assignments))
        assigned_subjects = sorted(list(set(a.subject_name for a in assignments)))

        # Authorized student count: students enrolled in teacher's sections
        authorized_students = 0
        if section_ids:
            authorized_students = (
                db.query(func.count(distinct(StudentEnrollment.student_id)))
                .filter(
                    StudentEnrollment.section_id.in_(section_ids),
                    StudentEnrollment.enrollment_status == "enrolled"
                )
                .scalar() or 0
            )

        assignment_list = [
            {
                "id": a.id,
                "class_name": a.class_.name,
                "section_name": a.section.name,
                "subject": a.subject_name,
                "role_type": a.role_type,
            }
            for a in assignments
        ]

        return TeacherDashboardStats(
            teacher_name=current_user.full_name,
            employee_id=teacher.employee_id,
            designation=teacher.designation,
            department=teacher.department,
            current_academic_year=current_year.name if current_year else "Current Term",
            total_assigned_classes=distinct_classes,
            total_authorized_students=authorized_students,
            assigned_subjects=assigned_subjects,
            assignments=assignment_list,
        )

    @staticmethod
    def get_student_dashboard(db: Session, current_user: User) -> StudentDashboardStats:
        student = current_user.student_profile
        if not student:
            return StudentDashboardStats(
                student_name=current_user.full_name,
                admission_number="N/A",
                status="inactive",
            )

        # Get latest enrollment
        enrollment = (
            db.query(StudentEnrollment)
            .filter(StudentEnrollment.student_id == student.id)
            .order_by(StudentEnrollment.id.desc())
            .first()
        )

        class_name = enrollment.class_.name if enrollment and enrollment.class_ else None
        section_name = enrollment.section.name if enrollment and enrollment.section else None
        year_name = enrollment.academic_year.name if enrollment and enrollment.academic_year else None
        roll_no = enrollment.roll_number if enrollment else None

        return StudentDashboardStats(
            student_name=current_user.full_name,
            admission_number=student.admission_number,
            roll_number=roll_no,
            class_name=class_name,
            section_name=section_name,
            current_academic_year=year_name,
            status=student.student_status,
            guardian_name=student.guardian_name,
        )
