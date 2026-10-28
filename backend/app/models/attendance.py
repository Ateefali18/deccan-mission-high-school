from sqlalchemy import Column, Integer, String, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin

class AttendanceSession(Base, TimestampMixin):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False)
    session_date = Column(Date, nullable=False, index=True)
    period_number = Column(Integer, default=0, nullable=False) # 0 for full day
    taken_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(20), default="submitted", nullable=False) # draft, submitted, cancelled

    __table_args__ = (
        UniqueConstraint("section_id", "session_date", "period_number", name="uq_attendance_session"),
    )

    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")


class AttendanceRecord(Base, TimestampMixin):
    __tablename__ = "attendance_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(20), default="present", nullable=False) # present, absent, late, excused
    remarks = Column(String(255), nullable=True)

    __table_args__ = (
        UniqueConstraint("session_id", "student_id", name="uq_attendance_record_student"),
    )

    session = relationship("AttendanceSession", back_populates="records")
