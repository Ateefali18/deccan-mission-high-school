from sqlalchemy import Column, Integer, String, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base
from app.models.base import TimestampMixin

def utc_now_date():
    return datetime.now(timezone.utc).date()

class StudentEnrollment(Base, TimestampMixin):
    __tablename__ = "student_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    roll_number = Column(String(50), nullable=True)
    enrollment_status = Column(String(50), default="enrolled", nullable=False)  # enrolled, promoted, retained, withdrawn
    enrolled_at = Column(Date, default=utc_now_date, nullable=False)

    # Relationships
    student = relationship("StudentProfile", back_populates="enrollments")
    academic_year = relationship("AcademicYear", back_populates="enrollments")
    class_ = relationship("Class", back_populates="enrollments")
    section = relationship("Section", back_populates="enrollments")

    __table_args__ = (
        UniqueConstraint("student_id", "academic_year_id", name="uq_student_academic_year_enrollment"),
    )
