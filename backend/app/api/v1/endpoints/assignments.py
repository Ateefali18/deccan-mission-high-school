from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date, datetime

from app.db.session import get_db
from app.api.deps import get_current_user, require_admin
from app.models.user import User
from app.models.assignment import Assignment, AssignmentSubmission
from app.models.class_model import Class
from app.models.section import Section

router = APIRouter()

class AssignmentCreate(BaseModel):
    title: str
    subject: str
    description: Optional[str] = None
    class_id: int
    section_id: Optional[int] = None
    due_date: date
    max_marks: Optional[float] = 20.0

@router.get("/")
def list_assignments(
    class_id: Optional[int] = None,
    section_id: Optional[int] = None,
    subject: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Assignment).filter(Assignment.school_id == current_user.school_id, Assignment.is_active == True)
    if class_id:
        query = query.filter(Assignment.class_id == class_id)
    if section_id:
        query = query.filter(Assignment.section_id == section_id)
    if subject:
        query = query.filter(Assignment.subject.ilike(f"%{subject}%"))

    assignments = query.order_by(Assignment.due_date.asc()).all()
    results = []
    for a in assignments:
        c = db.query(Class).filter(Class.id == a.class_id).first()
        sec = db.query(Section).filter(Section.id == a.section_id).first() if a.section_id else None
        results.append({
            "id": a.id,
            "title": a.title,
            "subject": a.subject,
            "description": a.description,
            "class_id": a.class_id,
            "class_name": c.name if c else "All Classes",
            "section_id": a.section_id,
            "section_name": sec.name if sec else "All Sections",
            "due_date": str(a.due_date),
            "max_marks": a.max_marks,
            "created_at": str(a.created_at),
        })
    return results

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: AssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Allowed for ADMIN or TEACHER
    teacher_id = getattr(current_user.teacher_profile, "id", None) if hasattr(current_user, "teacher_profile") else None

    assignment = Assignment(
        school_id=current_user.school_id,
        teacher_id=teacher_id,
        class_id=payload.class_id,
        section_id=payload.section_id,
        title=payload.title,
        subject=payload.subject,
        description=payload.description,
        due_date=payload.due_date,
        max_marks=payload.max_marks or 20.0,
        is_active=True,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment

@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id, Assignment.school_id == current_user.school_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    assignment.is_active = False
    db.commit()
    return {"message": "Assignment deleted successfully"}
