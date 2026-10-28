from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    schools,
    academic_years,
    classes,
    students,
    teachers,
    dashboards,
    search,
    health,
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(schools.router, prefix="/schools", tags=["School"])
api_router.include_router(academic_years.router, prefix="/academic-years", tags=["Academic Years"])
api_router.include_router(classes.router, prefix="/classes", tags=["Classes & Sections"])
api_router.include_router(students.router, prefix="/students", tags=["Students"])
api_router.include_router(teachers.router, prefix="/teachers", tags=["Teachers"])
api_router.include_router(dashboards.router, prefix="/dashboards", tags=["Dashboards"])
api_router.include_router(search.router, prefix="/search", tags=["Global Search"])
