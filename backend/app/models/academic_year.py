from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin

class AcademicYear(Base, TimestampMixin):
    __tablename__ = "academic_years"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(50), nullable=False)  # e.g. "2025-2026"
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=False, nullable=False)
    status = Column(String(20), default="active", nullable=False)  # planned, active, completed

    # Relationships
    school = relationship("School", back_populates="academic_years")
    enrollments = relationship("StudentEnrollment", back_populates="academic_year", cascade="all, delete-orphan")
    teacher_assignments = relationship("TeacherAssignment", back_populates="academic_year", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("school_id", "name", name="uq_school_academic_year"),
    )
