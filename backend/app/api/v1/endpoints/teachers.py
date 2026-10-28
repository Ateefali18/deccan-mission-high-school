from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, require_admin, require_teacher
from app.models.user import User
from app.schemas.teacher import TeacherCreate, TeacherProfileResponse, TeacherListResponse
from app.services.teacher_service import TeacherService
from app.core.exceptions import ResourceNotFoundException

router = APIRouter()

@router.get("/", response_model=TeacherListResponse)
def list_teachers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, total = TeacherService.list_teachers(
        db=db,
        school_id=current_user.school_id,
        page=page,
        limit=limit,
    )
    return TeacherListResponse(items=items, total=total, page=page, limit=limit)

@router.post("/", response_model=TeacherProfileResponse, status_code=status.HTTP_201_CREATED)
def create_teacher(
    payload: TeacherCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    profile = TeacherService.create_teacher(
        db=db,
        school_id=current_user.school_id,
        data=payload,
        admin_user_id=current_user.id,
    )
    return TeacherService.get_teacher_by_id(db, profile.id)

@router.get("/me/profile", response_model=TeacherProfileResponse)
def get_my_teacher_profile(
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db),
):
    if not current_user.teacher_profile:
        raise ResourceNotFoundException("No teacher profile linked to this account.")
    return TeacherService.get_teacher_by_id(db, current_user.teacher_profile.id)

@router.get("/{teacher_id}", response_model=TeacherProfileResponse)
def get_teacher_by_id(
    teacher_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return TeacherService.get_teacher_by_id(db, teacher_id)
