from sqlalchemy import Column, Integer, String, Boolean, Date, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin

class StudentProfile(Base, TimestampMixin):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    admission_number = Column(String(50), nullable=False)  # e.g. "ADM-2025-0101"
    gender = Column(String(20), nullable=True)  # Male, Female, Other
    date_of_birth = Column(Date, nullable=True)
    blood_group = Column(String(10), nullable=True)
    guardian_name = Column(String(255), nullable=True)
    guardian_phone = Column(String(50), nullable=True)
    emergency_contact = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    student_status = Column(String(50), default="active", nullable=False)  # active, alumni, transferred, suspended
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    user = relationship("User", back_populates="student_profile")
    enrollments = relationship("StudentEnrollment", back_populates="student", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("school_id", "admission_number", name="uq_school_student_admission_no"),
    )
