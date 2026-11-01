from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.schemas.class_section import ClassCreate, ClassUpdate, ClassResponse, SectionCreate, SectionUpdate, SectionResponse
from app.services.school_service import SchoolService

router = APIRouter()

@router.get("/", response_model=List[ClassResponse])
def list_classes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SchoolService.list_classes(db, current_user.school_id)

@router.post("/", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
def create_class(
    payload: ClassCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return SchoolService.create_class(db, current_user.school_id, payload, current_user.id)

@router.put("/{class_id}", response_model=ClassResponse)
def update_class(
    class_id: int,
    payload: ClassUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return SchoolService.update_class(db, class_id, payload, current_user.id)

@router.delete("/{class_id}", response_model=ClassResponse)
def deactivate_class(
    class_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return SchoolService.deactivate_class(db, class_id, current_user.id)

@router.post("/{class_id}/sections", response_model=SectionResponse, status_code=status.HTTP_201_CREATED)
def create_section(
    class_id: int,
    payload: SectionCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return SchoolService.create_section(db, class_id, payload, current_user.id)

@router.put("/sections/{section_id}", response_model=SectionResponse)
def update_section(
    section_id: int,
    payload: SectionUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return SchoolService.update_section(db, section_id, payload, current_user.id)

@router.delete("/sections/{section_id}", response_model=SectionResponse)
def deactivate_section(
    section_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return SchoolService.deactivate_section(db, section_id, current_user.id)
