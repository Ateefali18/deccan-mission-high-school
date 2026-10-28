from sqlalchemy import Column, Integer, String, Time, ForeignKey, UniqueConstraint
from app.db.session import Base
from app.models.base import TimestampMixin

class TimetableEntry(Base, TimestampMixin):
    __tablename__ = "timetable_entries"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    section_id = Column(Integer, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False)
    subject_name = Column(String(100), nullable=False)
    teacher_id = Column(Integer, ForeignKey("teacher_profiles.id", ondelete="SET NULL"), nullable=True)
    day_of_week = Column(Integer, nullable=False) # 1=Mon, 2=Tue, ..., 6=Sat
    period_number = Column(Integer, nullable=False) # 1 to 10
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    room_number = Column(String(50), nullable=True)

    __table_args__ = (
        UniqueConstraint("academic_year_id", "section_id", "day_of_week", "period_number", name="uq_section_timetable_period"),
    )
