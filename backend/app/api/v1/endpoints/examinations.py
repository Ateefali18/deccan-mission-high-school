from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.models.subject import Subject
from app.models.examination import Exam
from app.services.examination_service import ExaminationService
from app.schemas.examination import MarksSubmitPayload
from pydantic import BaseModel
from datetime import date

class SubjectPayload(BaseModel):
    name: str
    code: str
    department: Optional[str] = None
    is_active: bool = True

class ExamCreatePayload(BaseModel):
    name: str
    academic_year_id: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_published: bool = True

router = APIRouter()

def get_user_role(user: User) -> str:
    if user.roles:
        return user.roles[0].upper() if isinstance(user.roles[0], str) else user.roles[0].name.upper()
    return "STUDENT"

@router.get("/exams")
def list_exams(
    academic_year_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    List all exams configured for Deccan Mission High School.
    """
    exams = ExaminationService.list_exams(db, current_user.school_id, academic_year_id)
    return [
        {
            "id": e.id,
            "name": e.name,
            "academic_year_id": e.academic_year_id,
            "start_date": str(e.start_date) if e.start_date else None,
            "end_date": str(e.end_date) if e.end_date else None,
            "is_published": e.is_published,
        }
        for e in exams
    ]

@router.get("/subjects")
def list_subjects(
    class_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    List subjects (optionally filtered by class).
    """
    return ExaminationService.list_subjects(db, current_user.school_id, class_id)

@router.post("/subjects", status_code=status.HTTP_201_CREATED)
def create_subject(
    payload: SubjectPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_admin),
):
    existing = db.query(Subject).filter(Subject.school_id == current_user.school_id, Subject.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Subject with code '{payload.code}' already exists.")
    subject = Subject(
        school_id=current_user.school_id,
        name=payload.name,
        code=payload.code,
        department=payload.department,
        is_active=payload.is_active,
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

@router.put("/subjects/{subject_id}")
def update_subject(
    subject_id: int,
    payload: SubjectPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_admin),
):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.school_id == current_user.school_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")
    subject.name = payload.name
    subject.code = payload.code
    subject.department = payload.department
    subject.is_active = payload.is_active
    db.commit()
    db.refresh(subject)
    return subject

@router.delete("/subjects/{subject_id}")
def delete_subject(
    subject_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_admin),
):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.school_id == current_user.school_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found.")
    subject.is_active = False
    db.commit()
    return {"message": "Subject deactivated successfully"}

@router.post("/exams", status_code=status.HTTP_201_CREATED)
def create_exam(
    payload: ExamCreatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.require_admin),
):
    exam = Exam(
        school_id=current_user.school_id,
        academic_year_id=payload.academic_year_id,
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        is_published=payload.is_published,
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam

@router.get("/marks/entry-sheet")
def get_marks_entry_sheet(
    exam_id: int,
    class_id: int,
    section_id: int,
    subject_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Retrieve student roll list and existing marks for data entry / editing.
    Restricted to Teachers and Admins.
    """
    role = get_user_role(current_user)
    if role not in ["ADMIN", "TEACHER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return ExaminationService.get_marks_entry_sheet(
        db=db,
        school_id=current_user.school_id,
        exam_id=exam_id,
        class_id=class_id,
        section_id=section_id,
        subject_name=subject_name,
    )

@router.post("/marks")
def save_marks(
    payload: MarksSubmitPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Save or update marks for a class section subject.
    Validates against max marks and prevents duplicate records.
    Restricted to Teachers and Admins.
    """
    role = get_user_role(current_user)
    if role not in ["ADMIN", "TEACHER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only teachers and administrators can enter marks.")

    return ExaminationService.save_marks(
        db=db,
        school_id=current_user.school_id,
        user_id=current_user.id,
        exam_id=payload.exam_id,
        class_id=payload.class_id,
        section_id=payload.section_id,
        subject_name=payload.subject_name,
        max_marks=payload.max_marks,
        passing_marks=payload.passing_marks,
        entries=[e.dict() for e in payload.entries],
    )

@router.get("/results/class")
def get_class_results(
    exam_id: int,
    class_id: int,
    section_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Compute and view tabulated results for a class/section with SSC grades and ranks.
    """
    role = get_user_role(current_user)
    if role not in ["ADMIN", "TEACHER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return ExaminationService.get_class_results(
        db=db,
        school_id=current_user.school_id,
        exam_id=exam_id,
        class_id=class_id,
        section_id=section_id,
    )
