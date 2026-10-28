from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class ActivityLogItem(BaseModel):
    id: int
    action: str
    resource_type: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime
    user_name: Optional[str] = None

class AdminDashboardStats(BaseModel):
    total_active_students: int
    total_active_teachers: int
    total_classes: int
    total_sections: int
    current_academic_year: Optional[str] = None
    current_academic_year_id: Optional[int] = None
    recent_activity: List[ActivityLogItem] = []
    upcoming_features: List[str] = [
        "Attendance Management (Phase 2)",
        "Examination & Marks (Phase 2)",
        "Timetable & Schedules (Phase 2)",
        "Fee Management (Phase 2)",
        "AI Assistant & Data Querying (Phase 3)"
    ]

class TeacherDashboardStats(BaseModel):
    teacher_name: str
    employee_id: str
    designation: str
    department: Optional[str] = None
    current_academic_year: Optional[str] = None
    total_assigned_classes: int
    total_authorized_students: int
    assigned_subjects: List[str] = []
    assignments: List[dict] = []
    today_schedule_placeholder: str = "Timetable and period schedule will be available in Phase 2."

class StudentDashboardStats(BaseModel):
    student_name: str
    admission_number: str
    roll_number: Optional[str] = None
    class_name: Optional[str] = None
    section_name: Optional[str] = None
    current_academic_year: Optional[str] = None
    status: str
    guardian_name: Optional[str] = None
    today_schedule_placeholder: str = "Timetable and period schedule will be available in Phase 2."
