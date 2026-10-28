from datetime import date
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.attendance import AttendanceSession, AttendanceRecord
from app.models.student_profile import StudentProfile
from app.models.student_enrollment import StudentEnrollment
from app.models.academic_year import AcademicYear
from app.core.config import settings

class AttendanceService:
    @staticmethod
    def calculate_percentage(
        present_count: int,
        late_count: int,
        absent_count: int,
        excused_count: int,
        late_weight: float = None,
        excused_in_denominator: bool = None,
    ) -> float:
        """
        Standardized school attendance formula for Deccan Mission High School:
        Percentage = (Present + Late * weight) / (Total Eligible Sessions) * 100
        """
        if late_weight is None:
            late_weight = settings.ATTENDANCE_LATE_WEIGHT
        if excused_in_denominator is None:
            excused_in_denominator = settings.ATTENDANCE_EXCUSED_IN_DENOMINATOR

        attended = float(present_count) + (float(late_count) * late_weight)
        
        if excused_in_denominator:
            denominator = present_count + late_count + absent_count + excused_count
        else:
            denominator = present_count + late_count + absent_count

        if denominator <= 0:
            return 100.0  # No sessions held or all excused
        
        pct = (attended / denominator) * 100.0
        return round(min(100.0, max(0.0, pct)), 2)

    @staticmethod
    def get_student_attendance(
        db: Session, student_id: int, academic_year_id: Optional[int] = None
    ) -> Dict[str, Any]:
        query = (
            db.query(AttendanceRecord.status, func.count(AttendanceRecord.id))
            .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
            .filter(AttendanceRecord.student_id == student_id)
            .filter(AttendanceSession.status == "submitted")
        )
        if academic_year_id:
            query = query.filter(AttendanceSession.academic_year_id == academic_year_id)

        status_counts = dict(query.group_by(AttendanceRecord.status).all())

        present = status_counts.get("present", 0)
        late = status_counts.get("late", 0)
        absent = status_counts.get("absent", 0)
        excused = status_counts.get("excused", 0)
        total = present + late + absent + excused

        pct = AttendanceService.calculate_percentage(present, late, absent, excused)

        return {
            "student_id": student_id,
            "total_sessions": total,
            "present_count": present,
            "late_count": late,
            "absent_count": absent,
            "excused_count": excused,
            "attendance_percentage": pct,
            "is_low_attendance": pct < 75.0,
        }

    @staticmethod
    def get_low_attendance_students(
        db: Session,
        school_id: int,
        threshold: float = 75.0,
        class_id: Optional[int] = None,
        section_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        query = (
            db.query(StudentProfile)
            .join(StudentEnrollment, StudentEnrollment.student_id == StudentProfile.id)
            .filter(StudentProfile.school_id == school_id)
            .filter(StudentEnrollment.enrollment_status.in_(["enrolled", "active"]))
        )
        if class_id:
            query = query.filter(StudentEnrollment.class_id == class_id)
        if section_id:
            query = query.filter(StudentEnrollment.section_id == section_id)

        students = query.all()
        low_att_list = []

        for student in students:
            stat = AttendanceService.get_student_attendance(db, student.id)
            if stat["total_sessions"] > 0 and stat["attendance_percentage"] < threshold:
                low_att_list.append({
                    "student_id": student.id,
                    "admission_number": student.admission_number,
                    "full_name": student.user.full_name if student.user else "Student",
                    "attendance_percentage": stat["attendance_percentage"],
                    "absent_count": stat["absent_count"],
                    "total_sessions": stat["total_sessions"],
                })

        return low_att_list

    @staticmethod
    def record_attendance_session(
        db: Session,
        school_id: int,
        academic_year_id: int,
        class_id: int,
        section_id: int,
        session_date: date,
        period_number: int,
        user_id: Optional[int],
        records: List[Dict[str, Any]],
    ) -> AttendanceSession:
        # Check existing session
        session = (
            db.query(AttendanceSession)
            .filter(
                AttendanceSession.section_id == section_id,
                AttendanceSession.session_date == session_date,
                AttendanceSession.period_number == period_number,
            )
            .first()
        )

        if not session:
            session = AttendanceSession(
                school_id=school_id,
                academic_year_id=academic_year_id,
                class_id=class_id,
                section_id=section_id,
                session_date=session_date,
                period_number=period_number,
                taken_by_user_id=user_id,
                status="submitted",
            )
            db.add(session)
            db.flush()

        # Upsert records
        for rec in records:
            student_id = rec["student_id"]
            status = rec.get("status", "present")
            remarks = rec.get("remarks")

            existing_record = (
                db.query(AttendanceRecord)
                .filter(
                    AttendanceRecord.session_id == session.id,
                    AttendanceRecord.student_id == student_id,
                )
                .first()
            )

            if existing_record:
                existing_record.status = status
                existing_record.remarks = remarks
            else:
                new_rec = AttendanceRecord(
                    session_id=session.id,
                    student_id=student_id,
                    status=status,
                    remarks=remarks,
                )
                db.add(new_rec)

        db.commit()
        db.refresh(session)
        return session
