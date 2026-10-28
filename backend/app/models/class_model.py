from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin

class Class(Base, TimestampMixin):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)  # e.g. "Class 10", "Grade 5"
    grade_level = Column(Integer, nullable=False)  # e.g. 10
    stream = Column(String(50), nullable=True)  # General, Science, Commerce
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    school = relationship("School", back_populates="classes")
    sections = relationship("Section", back_populates="class_", cascade="all, delete-orphan")
    enrollments = relationship("StudentEnrollment", back_populates="class_")
    teacher_assignments = relationship("TeacherAssignment", back_populates="class_")

    __table_args__ = (
        UniqueConstraint("school_id", "name", name="uq_school_class_name"),
    )
