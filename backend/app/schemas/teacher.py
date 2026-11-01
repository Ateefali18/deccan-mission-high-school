from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr

class TeacherCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    employee_id: str
    designation: str = "Teacher"
    department: Optional[str] = None
    qualification: Optional[str] = None
    contact_phone: Optional[str] = None
    joining_date: Optional[date] = None

class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    qualification: Optional[str] = None
    specialization: Optional[str] = None
    contact_phone: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None
    employment_status: Optional[str] = None

class TeacherAssignmentDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    academic_year_id: int
    academic_year_name: str
    class_id: int
    class_name: str
    section_id: int
    section_name: str
    subject_name: str
    role_type: str

class TeacherProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    employee_id: str
    full_name: str
    email: str
    designation: str
    department: Optional[str] = None
    qualification: Optional[str] = None
    joining_date: Optional[date] = None
    employment_status: str
    is_active: bool
    assignments: List[TeacherAssignmentDetail] = []
    created_at: datetime

class TeacherListItem(BaseModel):
    id: int
    employee_id: str
    full_name: str
    email: str
    designation: str
    department: Optional[str] = None
    employment_status: str
    assigned_classes_count: int

class TeacherListResponse(BaseModel):
    items: List[TeacherListItem]
    total: int
    page: int
    limit: int
