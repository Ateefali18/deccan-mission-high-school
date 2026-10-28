from datetime import datetime, time
import zoneinfo
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.timetable import TimetableEntry
from app.models.student_profile import StudentProfile
from app.models.student_enrollment import StudentEnrollment
from app.models.teacher_profile import TeacherProfile
from app.models.academic_year import AcademicYear
from app.core.config import settings

def get_current_school_time() -> datetime:
    try:
        tz = zoneinfo.ZoneInfo(settings.TIMEZONE)
        return datetime.now(tz)
    except Exception:
        return datetime.now()

class TimetableService:
    @staticmethod
    def get_next_period_for_user(
        db: Session,
        user_id: int,
        role: str,
    ) -> Dict[str, Any]:
        now = get_current_school_time()
        current_time = now.time()
        weekday = now.isoweekday()  # 1 = Monday, 7 = Sunday

        if weekday == 7:
            return {
                "status": "weekend",
                "message": "Today is Sunday (School Weekend). Next scheduled school day is Monday at 08:30 AM.",
                "current_period": None,
                "next_period": None,
                "reporting_time": now.strftime("%Y-%m-%d %H:%M:%S %Z"),
            }

        # Resolve entity
        query = db.query(TimetableEntry).filter(TimetableEntry.day_of_week == weekday)

        if role == "TEACHER":
            teacher = db.query(TeacherProfile).filter(TeacherProfile.user_id == user_id).first()
            if not teacher:
                return {"status": "not_found", "message": "Teacher profile not linked."}
            query = query.filter(TimetableEntry.teacher_id == teacher.id)
        elif role == "STUDENT":
            student = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
            if not student:
                return {"status": "not_found", "message": "Student profile not linked."}
            enrollment = (
                db.query(StudentEnrollment)
                .filter(
                    StudentEnrollment.student_id == student.id,
                    StudentEnrollment.enrollment_status.in_(["enrolled", "active"]),
                )
                .first()
            )
            if not enrollment:
                return {"status": "not_enrolled", "message": "No active class enrollment for current session."}
            query = query.filter(TimetableEntry.section_id == enrollment.section_id)
        else:
            return {
                "status": "info",
                "message": "As an administrator, please specify a class or teacher to check their timetable schedule.",
            }

        entries = query.order_by(TimetableEntry.period_number.asc()).all()

        if not entries:
            return {
                "status": "no_schedule",
                "message": "No timetable periods scheduled for today.",
                "reporting_time": now.strftime("%Y-%m-%d %H:%M:%S %Z"),
            }

        current_period = None
        next_period = None

        for entry in entries:
            if entry.start_time <= current_time <= entry.end_time:
                current_period = {
                    "period_number": entry.period_number,
                    "subject": entry.subject_name,
                    "room": entry.room_number or "Assigned Room",
                    "start_time": entry.start_time.strftime("%I:%M %p"),
                    "end_time": entry.end_time.strftime("%I:%M %p"),
                }
            elif entry.start_time > current_time and not next_period:
                next_period = {
                    "period_number": entry.period_number,
                    "subject": entry.subject_name,
                    "room": entry.room_number or "Assigned Room",
                    "start_time": entry.start_time.strftime("%I:%M %p"),
                    "end_time": entry.end_time.strftime("%I:%M %p"),
                }

        if current_period and next_period:
            msg = (
                f"You are currently in Period {current_period['period_number']} ({current_period['subject']}, until {current_period['end_time']}). "
                f"Your next period is Period {next_period['period_number']} ({next_period['subject']}) in {next_period['room']} at {next_period['start_time']}."
            )
        elif current_period and not next_period:
            msg = f"You are currently in Period {current_period['period_number']} ({current_period['subject']}). This is your final scheduled period for today."
        elif next_period:
            msg = f"Your next period today is Period {next_period['period_number']} ({next_period['subject']}) in {next_period['room']} starting at {next_period['start_time']}."
        else:
            msg = "All scheduled periods for today have concluded. Your next school day begins tomorrow at 08:30 AM."

        return {
            "status": "success",
            "message": msg,
            "current_period": current_period,
            "next_period": next_period,
            "reporting_time": now.strftime("%Y-%m-%d %H:%M:%S %Z"),
        }

    @staticmethod
    def get_schedule(
        db: Session,
        class_id: Optional[int] = None,
        section_id: Optional[int] = None,
        teacher_id: Optional[int] = None,
        day_of_week: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        query = db.query(TimetableEntry)
        if day_of_week:
            query = query.filter(TimetableEntry.day_of_week == day_of_week)
        if section_id:
            query = query.filter(TimetableEntry.section_id == section_id)
        elif class_id:
            query = query.filter(TimetableEntry.class_id == class_id)
        if teacher_id:
            query = query.filter(TimetableEntry.teacher_id == teacher_id)

        entries = query.order_by(TimetableEntry.period_number.asc()).all()
        return [
            {
                "id": e.id,
                "period_number": e.period_number,
                "subject": e.subject_name,
                "room": e.room_number,
                "start_time": e.start_time.strftime("%I:%M %p"),
                "end_time": e.end_time.strftime("%I:%M %p"),
                "day_of_week": e.day_of_week,
            }
            for e in entries
        ]
