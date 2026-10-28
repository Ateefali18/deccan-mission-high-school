from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin

class TeacherProfile(Base, TimestampMixin):
    __tablename__ = "teacher_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    employee_id = Column(String(50), nullable=False)  # e.g. "EMP-1001"
    designation = Column(String(100), default="Teacher", nullable=False)
    department = Column(String(100), nullable=True)  # e.g. "Mathematics", "Science"
    qualification = Column(String(255), nullable=True)  # e.g. "M.Sc, B.Ed"
    joining_date = Column(Date, nullable=True)
    employment_status = Column(String(50), default="active", nullable=False)  # active, on_leave, resigned, retired
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="teacher_profile")
    assignments = relationship("TeacherAssignment", back_populates="teacher", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("school_id", "employee_id", name="uq_school_teacher_employee_id"),
    )
