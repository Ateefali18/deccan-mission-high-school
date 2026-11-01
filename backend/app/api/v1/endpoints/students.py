from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, require_admin, require_student
from app.models.user import User
from app.schemas.student import StudentCreate, StudentUpdate, StudentProfileResponse, StudentListResponse
from app.services.student_service import StudentService
from app.core.exceptions import ResourceNotFoundException

router = APIRouter()

@router.get("/", response_model=StudentListResponse)
def list_students(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    class_id: Optional[int] = None,
    section_id: Optional[int] = None,
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items, total = StudentService.list_students(
        db=db,
        school_id=current_user.school_id,
        page=page,
        limit=limit,
        class_id=class_id,
        section_id=section_id,
        search=search,
        status=status,
    )
    return StudentListResponse(items=items, total=total, page=page, limit=limit)

@router.post("/", response_model=StudentProfileResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    profile = StudentService.create_student(
        db=db,
        school_id=current_user.school_id,
        data=payload,
        admin_user_id=current_user.id,
    )
    return StudentService.get_student_by_id(db, current_user, profile.id)

@router.get("/me/profile", response_model=StudentProfileResponse)
def get_my_student_profile(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db),
):
    if not current_user.student_profile:
        raise ResourceNotFoundException("No student profile linked to this account.")
    return StudentService.get_student_by_id(db, current_user, current_user.student_profile.id)

@router.get("/{student_id}", response_model=StudentProfileResponse)
def get_student_by_id(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return StudentService.get_student_by_id(db, current_user, student_id)

@router.put("/{student_id}", response_model=StudentProfileResponse)
def update_student(
    student_id: int,
    payload: StudentUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    StudentService.update_student(db, student_id, payload, current_user.id)
    return StudentService.get_student_by_id(db, current_user, student_id)

@router.delete("/{student_id}", response_model=StudentProfileResponse)
def deactivate_student(
    student_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    StudentService.deactivate_student(db, student_id, current_user.id)
    return StudentService.get_student_by_id(db, current_user, student_id)
