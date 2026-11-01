from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr

class StudentCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    admission_number: str
    roll_number: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    address: Optional[str] = None
    class_id: int
    section_id: int
    academic_year_id: int

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    roll_number: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    address: Optional[str] = None
    student_status: Optional[str] = None
    is_active: Optional[bool] = None
    class_id: Optional[int] = None
    section_id: Optional[int] = None
    academic_year_id: Optional[int] = None

class EnrollmentDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    academic_year_id: int
    academic_year_name: str
    class_id: int
    class_name: str
    section_id: int
    section_name: str
    roll_number: Optional[str] = None
    enrollment_status: str

class StudentProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    admission_number: str
    full_name: str
    email: str
    gender: Optional[str] = None
    date_of_birth: Optional[date] = None
    blood_group: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    address: Optional[str] = None
    student_status: str
    is_active: bool
    current_enrollment: Optional[EnrollmentDetail] = None
    created_at: datetime

class StudentListItem(BaseModel):
    id: int
    admission_number: str
    full_name: str
    email: str
    class_name: Optional[str] = None
    section_name: Optional[str] = None
    roll_number: Optional[str] = None
    student_status: str

class StudentListResponse(BaseModel):
    items: List[StudentListItem]
    total: int
    page: int
    limit: int
