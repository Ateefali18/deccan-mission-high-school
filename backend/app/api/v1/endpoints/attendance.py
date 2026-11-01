from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import date
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.services.attendance_service import AttendanceService

router = APIRouter()

class AttendanceRecordItem(BaseModel):
    student_id: int
    status: str = Field(..., pattern="^(present|absent|late|excused)$")
    remarks: Optional[str] = None

class AttendanceSessionCreate(BaseModel):
    academic_year_id: int
    class_id: int
    section_id: int
    session_date: date
    period_number: int = 0
    records: List[AttendanceRecordItem]

def get_user_role(user: User) -> str:
    if user.roles:
        return user.roles[0].upper() if isinstance(user.roles[0], str) else user.roles[0].name.upper()
    return "STUDENT"

@router.post("/sessions")
def submit_attendance(
    payload: AttendanceSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Submit daily or period-wise attendance roll call.
    Authorized for Admins and assigned Class Teachers.
    """
    user_role = get_user_role(current_user)
    if user_role not in ["ADMIN", "TEACHER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers and administrators can record attendance.")

    session = AttendanceService.record_attendance_session(
        db=db,
        school_id=current_user.school_id,
        academic_year_id=payload.academic_year_id,
        class_id=payload.class_id,
        section_id=payload.section_id,
        session_date=payload.session_date,
        period_number=payload.period_number,
        user_id=current_user.id,
        records=[r.dict() for r in payload.records],
    )

    return {
        "status": "success",
        "session_id": session.id,
        "session_date": str(session.session_date),
        "total_records": len(payload.records),
        "message": "Attendance records saved successfully.",
    }

@router.get("/students/{student_id}/summary")
def get_student_attendance_summary(
    student_id: int,
    academic_year_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Get standardized attendance summary and percentage for a student.
    Enforces student isolation: students can only view their own summary.
    """
    user_role = get_user_role(current_user)
    if user_role == "STUDENT":
        if not current_user.student_profile or current_user.student_profile.id != student_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Cannot access other student records.")

    return AttendanceService.get_student_attendance(db, student_id, academic_year_id)

@router.get("/low-attendance")
def get_low_attendance_report(
    threshold: float = 75.0,
    class_id: Optional[int] = None,
    section_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Get report of students with attendance below threshold (default: 75%).
    Restricted to Admins and assigned Class Teachers.
    """
    user_role = get_user_role(current_user)
    if user_role not in ["ADMIN", "TEACHER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return AttendanceService.get_low_attendance_students(
        db, current_user.school_id, threshold=threshold, class_id=class_id, section_id=section_id
    )

@router.get("/sessions")
def get_attendance_session(
    section_id: int,
    session_date: date,
    period_number: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Retrieve attendance records for a given section and date.
    Allows teachers and admins to inspect and edit existing attendance.
    """
    user_role = get_user_role(current_user)
    if user_role not in ["ADMIN", "TEACHER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    data = AttendanceService.get_session_records(
        db=db,
        school_id=current_user.school_id,
        section_id=section_id,
        session_date=session_date,
        period_number=period_number,
    )
    return data or {"session_id": None, "records": {}}

@router.get("/reports/date-wise")
def get_date_wise_report(
    class_id: Optional[int] = None,
    section_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Retrieve date-wise attendance audit report with percentages.
    """
    user_role = get_user_role(current_user)
    if user_role not in ["ADMIN", "TEACHER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return AttendanceService.get_date_wise_report(
        db=db,
        school_id=current_user.school_id,
        class_id=class_id,
        section_id=section_id,
        from_date=from_date,
        to_date=to_date,
    )
