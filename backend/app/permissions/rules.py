from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.student_profile import StudentProfile
from app.models.teacher_profile import TeacherProfile
from app.models.teacher_assignment import TeacherAssignment
from app.models.student_enrollment import StudentEnrollment
from app.core.exceptions import PermissionDeniedException

class PermissionService:
    @staticmethod
    def require_roles(current_user: User, allowed_roles: List[str]) -> None:
        user_roles = current_user.roles
        if not any(role in allowed_roles for role in user_roles):
            raise PermissionDeniedException(
                f"Action requires one of the following roles: {', '.join(allowed_roles)}. Your roles: {', '.join(user_roles)}"
            )

    @staticmethod
    def ensure_school_isolation(current_user: User, school_id: int) -> None:
        if current_user.school_id != school_id:
            raise PermissionDeniedException("Access denied: School isolation violation.")

    @staticmethod
    def can_access_student_record(db: Session, current_user: User, student_profile_id: int) -> bool:
        roles = current_user.roles
        if "ADMIN" in roles:
            # Check school isolation
            student = db.query(StudentProfile).filter(StudentProfile.id == student_profile_id).first()
            if student and student.school_id == current_user.school_id:
                return True
            return False

        if "STUDENT" in roles:
            # Student can ONLY access their own profile
            if current_user.student_profile and current_user.student_profile.id == student_profile_id:
                return True
            return False

        if "TEACHER" in roles:
            if not current_user.teacher_profile:
                return False
            # Teacher can only access students enrolled in their assigned classes/sections
            teacher_id = current_user.teacher_profile.id
            teacher_sections = (
                db.query(TeacherAssignment.section_id)
                .filter(TeacherAssignment.teacher_id == teacher_id, TeacherAssignment.is_active.is_(True))
                .all()
            )
            section_ids = [s[0] for s in teacher_sections]
            
            # Check if student is currently enrolled in any of these sections
            is_enrolled = (
                db.query(StudentEnrollment)
                .filter(
                    StudentEnrollment.student_id == student_profile_id,
                    StudentEnrollment.section_id.in_(section_ids)
                )
                .first()
            )
            return is_enrolled is not None

        return False

    @staticmethod
    def can_access_section(db: Session, current_user: User, section_id: int) -> bool:
        roles = current_user.roles
        if "ADMIN" in roles:
            return True
        if "TEACHER" in roles:
            if not current_user.teacher_profile:
                return False
            assignment = (
                db.query(TeacherAssignment)
                .filter(
                    TeacherAssignment.teacher_id == current_user.teacher_profile.id,
                    TeacherAssignment.section_id == section_id,
                    TeacherAssignment.is_active.is_(True)
                )
                .first()
            )
            return assignment is not None
        return False
