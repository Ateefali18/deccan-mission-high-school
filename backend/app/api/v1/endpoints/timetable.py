from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.services.timetable_service import TimetableService

router = APIRouter()

@router.get("/next-period")
def get_next_period(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Get current active period and next upcoming period for current user
    based on current local time in Asia/Kolkata and saved schedule.
    """
    user_role = current_user.roles[0].upper() if current_user.roles else "STUDENT"
    return TimetableService.get_next_period_for_user(db, current_user.id, user_role)

@router.get("/schedule")
def get_schedule(
    class_id: Optional[int] = None,
    section_id: Optional[int] = None,
    teacher_id: Optional[int] = None,
    day_of_week: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Retrieve schedule periods for a class, section, or teacher.
    """
    return TimetableService.get_schedule(
        db, class_id=class_id, section_id=section_id, teacher_id=teacher_id, day_of_week=day_of_week
    )
