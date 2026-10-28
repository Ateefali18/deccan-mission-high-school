from app.schemas.auth import LoginRequest, TokenResponse, UserProfileResponse, CurrentUserResponse
from app.schemas.school import SchoolResponse, SchoolUpdate
from app.schemas.academic_year import AcademicYearCreate, AcademicYearResponse
from app.schemas.class_section import ClassCreate, ClassResponse, SectionCreate, SectionResponse
from app.schemas.student import StudentCreate, StudentProfileResponse, StudentListResponse
from app.schemas.teacher import TeacherCreate, TeacherProfileResponse, TeacherListResponse
from app.schemas.dashboard import AdminDashboardStats, TeacherDashboardStats, StudentDashboardStats
from app.schemas.search import SearchResultItem, SearchResponse

__all__ = [
    "LoginRequest",
    "TokenResponse",
    "UserProfileResponse",
    "CurrentUserResponse",
    "SchoolResponse",
    "SchoolUpdate",
    "AcademicYearCreate",
    "AcademicYearResponse",
    "ClassCreate",
    "ClassResponse",
    "SectionCreate",
    "SectionResponse",
    "StudentCreate",
    "StudentProfileResponse",
    "StudentListResponse",
    "TeacherCreate",
    "TeacherProfileResponse",
    "TeacherListResponse",
    "AdminDashboardStats",
    "TeacherDashboardStats",
    "StudentDashboardStats",
    "SearchResultItem",
    "SearchResponse",
]
