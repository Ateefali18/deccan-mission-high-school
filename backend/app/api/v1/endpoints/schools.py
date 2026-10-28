from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.models.school import School
from app.schemas.school import SchoolResponse
from app.core.exceptions import ResourceNotFoundException

router = APIRouter()

@router.get("/current", response_model=SchoolResponse)
def get_current_school(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    school = db.query(School).filter(School.id == current_user.school_id).first()
    if not school:
        raise ResourceNotFoundException("School configuration not found.")
    return school
