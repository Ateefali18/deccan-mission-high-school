from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: str
    full_name: str
    username: str

class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    school_id: int
    username: str
    email: str
    full_name: str
    phone_number: Optional[str] = None
    is_active: bool
    roles: List[str]
    last_login_at: Optional[datetime] = None

class CurrentUserResponse(BaseModel):
    user: UserProfileResponse
    role: str  # Primary active role for portal
    school_name: str
    school_code: str
    profile_id: Optional[int] = None
    identifier: Optional[str] = None  # admission_number or employee_id
