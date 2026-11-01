from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, time

class SubjectResponse(BaseModel):
    id: int
    name: str
    code: str
    department: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True

class ExamSubjectResponse(BaseModel):
    id: int
    exam_id: int
    class_id: int
    subject_id: Optional[int] = None
    subject_name: str
    max_marks: float = 100.0
    passing_marks: float = 35.0
    exam_date: Optional[date] = None

    class Config:
        from_attributes = True

class ExamResponse(BaseModel):
    id: int
    name: str
    academic_year_id: int
    exam_type: Optional[str] = "summative"
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_published: bool = False
    subjects: List[ExamSubjectResponse] = []

    class Config:
        from_attributes = True

class MarkEntryItem(BaseModel):
    student_id: int
    marks_obtained: Optional[float] = None
    is_absent: bool = False
    remarks: Optional[str] = None

class MarksSubmitPayload(BaseModel):
    exam_id: int
    class_id: int
    section_id: int
    subject_name: str
    max_marks: float = 100.0
    passing_marks: float = 35.0
    entries: List[MarkEntryItem]

class StudentMarksheetItem(BaseModel):
    subject_name: str
    max_marks: float
    passing_marks: float
    marks_obtained: Optional[float]
    is_absent: bool
    grade: str
    remarks: Optional[str] = None

class StudentResultReport(BaseModel):
    student_id: int
    admission_number: str
    full_name: str
    roll_number: Optional[str] = None
    class_name: str
    section_name: str
    exam_name: str
    total_max_marks: float
    total_obtained_marks: float
    percentage: float
    overall_grade: str
    rank: Optional[int] = None
    status: str  # "Passed" | "Failed" | "Absent"
    subjects: List[StudentMarksheetItem] = []
