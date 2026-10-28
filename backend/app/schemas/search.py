from typing import List, Optional
from pydantic import BaseModel

class SearchResultItem(BaseModel):
    id: int
    type: str  # "student" or "teacher"
    identifier: str  # admission_number or employee_id
    title: str  # Full name
    subtitle: str  # Class/Section for student, Designation/Dept for teacher
    metadata: Optional[dict] = None

class SearchResponse(BaseModel):
    query: str
    total: int
    results: List[SearchResultItem]
