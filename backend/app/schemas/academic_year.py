from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

class AcademicYearBase(BaseModel):
    name: str
    start_date: date
    end_date: date
    is_current: bool = False
    status: str = "active"

class AcademicYearCreate(AcademicYearBase):
    pass

class AcademicYearResponse(AcademicYearBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: int
    created_at: datetime
    updated_at: datetime
