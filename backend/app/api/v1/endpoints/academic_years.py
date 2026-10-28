from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.schemas.academic_year import AcademicYearCreate, AcademicYearResponse
from app.services.school_service import SchoolService

router = APIRouter()

@router.get("/", response_model=List[AcademicYearResponse])
def list_academic_years(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SchoolService.list_academic_years(db, current_user.school_id)

@router.post("/", response_model=AcademicYearResponse, status_code=status.HTTP_201_CREATED)
def create_academic_year(
    payload: AcademicYearCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return SchoolService.create_academic_year(db, current_user.school_id, payload, current_user.id)
