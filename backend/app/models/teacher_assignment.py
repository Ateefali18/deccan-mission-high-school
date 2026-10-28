from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin

class TeacherAssignment(Base, TimestampMixin):
    __tablename__ = "teacher_assignments"

    id = Column(Integer, primary_key=True, index=True)
    teacher_id = Column(Integer, ForeignKey("teacher_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_name = Column(String(100), nullable=False)  # e.g. "Mathematics", "Science", "English"
    role_type = Column(String(50), default="subject_teacher", nullable=False)  # class_teacher, subject_teacher
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    teacher = relationship("TeacherProfile", back_populates="assignments")
    academic_year = relationship("AcademicYear", back_populates="teacher_assignments")
    class_ = relationship("Class", back_populates="teacher_assignments")
    section = relationship("Section", back_populates="teacher_assignments")

    __table_args__ = (
        UniqueConstraint("teacher_id", "academic_year_id", "class_id", "section_id", "subject_name", name="uq_teacher_assignment"),
    )
