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
    attendance,
    timetable,
    ai,
    examinations,
    notices,
    health,
    fees,
    assignments,
    reports,
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
api_router.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
api_router.include_router(timetable.router, prefix="/timetable", tags=["Timetable"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Assistant"])
api_router.include_router(examinations.router, prefix="/examinations", tags=["Examinations & Marks"])
api_router.include_router(notices.router, prefix="/notices", tags=["Notices & Announcements"])
api_router.include_router(fees.router, prefix="/fees", tags=["Fees & Payments"])
api_router.include_router(assignments.router, prefix="/assignments", tags=["Assignments"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Analytics"])

