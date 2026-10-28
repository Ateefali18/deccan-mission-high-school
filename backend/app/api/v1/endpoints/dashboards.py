from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import require_admin, require_teacher, require_student
from app.models.user import User
from app.schemas.dashboard import AdminDashboardStats, TeacherDashboardStats, StudentDashboardStats
from app.services.dashboard_service import DashboardService

router = APIRouter()

@router.get("/admin", response_model=AdminDashboardStats)
def get_admin_dashboard(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return DashboardService.get_admin_dashboard(db, current_user.school_id)

@router.get("/teacher", response_model=TeacherDashboardStats)
def get_teacher_dashboard(
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    return DashboardService.get_teacher_dashboard(db, current_user)

@router.get("/student", response_model=StudentDashboardStats)
def get_student_dashboard(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    return DashboardService.get_student_dashboard(db, current_user)
