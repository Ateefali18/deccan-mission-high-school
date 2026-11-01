from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.models.notice import Notice
from app.models.base import utc_now

router = APIRouter()

class NoticeCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=5)
    target_audience: str = Field("all", description="all, teachers, students, parents")
    priority: str = Field("normal", description="normal, high, urgent")
    is_published: bool = True

class NoticeResponse(BaseModel):
    id: int
    school_id: int
    title: str
    content: str
    target_audience: str
    priority: str
    is_published: bool
    publish_date: datetime

    class Config:
        from_attributes = True

@router.get("/", response_model=List[NoticeResponse])
def list_notices(
    audience: Optional[str] = "all",
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    List notices relevant to the current user's school and role scope.
    """
    user_role = (current_user.roles[0] if current_user.roles else "student").lower()
    query = db.query(Notice).filter(Notice.school_id == current_user.school_id, Notice.is_published == True)

    if user_role != "admin":
        query = query.filter(Notice.target_audience.in_(["all", user_role]))
    elif audience and audience != "all":
        query = query.filter(Notice.target_audience.in_(["all", audience.lower()]))

    return query.order_by(Notice.publish_date.desc()).limit(20).all()

@router.post("/", response_model=NoticeResponse, status_code=status.HTTP_201_CREATED)
def create_notice(
    payload: NoticeCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_admin),
):
    """
    Publish an official school notice or circular (Admin only).
    """
    new_notice = Notice(
        school_id=current_user.school_id,
        title=payload.title,
        content=payload.content,
        target_audience=payload.target_audience,
        priority=payload.priority,
        is_published=payload.is_published,
        publish_date=utc_now(),
        created_by_user_id=current_user.id,
    )
    db.add(new_notice)
    db.commit()
    db.refresh(new_notice)
    return new_notice
