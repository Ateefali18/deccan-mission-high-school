from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class SectionBase(BaseModel):
    name: str
    room_number: Optional[str] = None
    capacity: int = 40
    is_active: bool = True

class SectionCreate(SectionBase):
    pass

class SectionUpdate(BaseModel):
    name: Optional[str] = None
    room_number: Optional[str] = None
    capacity: Optional[int] = None
    is_active: Optional[bool] = None

class SectionResponse(SectionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    class_id: int
    created_at: datetime

class ClassBase(BaseModel):
    name: str
    grade_level: int
    stream: Optional[str] = "General"
    is_active: bool = True

class ClassCreate(ClassBase):
    pass

class ClassUpdate(BaseModel):
    name: Optional[str] = None
    grade_level: Optional[int] = None
    stream: Optional[str] = None
    is_active: Optional[bool] = None

class ClassResponse(ClassBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: int
    sections: List[SectionResponse] = []
    created_at: datetime
