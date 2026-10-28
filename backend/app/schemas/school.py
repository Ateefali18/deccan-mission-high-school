from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class SchoolBase(BaseModel):
    name: str
    code: str
    affiliation_number: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    timezone: str = "Asia/Kolkata"

class SchoolResponse(SchoolBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

class SchoolUpdate(BaseModel):
    name: Optional[str] = None
    affiliation_number: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    timezone: Optional[str] = None
