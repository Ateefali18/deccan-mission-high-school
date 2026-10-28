from sqlalchemy import Column, Integer, String, Float, Boolean, Date, Time, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin

class ExamType(Base, TimestampMixin):
    __tablename__ = "exam_types"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False)
    weightage_percentage = Column(Float, default=100.0, nullable=False)


class Exam(Base, TimestampMixin):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False)
    exam_type_id = Column(Integer, ForeignKey("exam_types.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(150), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)

    subjects = relationship("ExamSubject", back_populates="exam", cascade="all, delete-orphan")


class ExamSubject(Base, TimestampMixin):
    __tablename__ = "exam_subjects"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    subject_name = Column(String(100), nullable=False)
    max_marks = Column(Float, default=100.0, nullable=False)
    passing_marks = Column(Float, default=35.0, nullable=False)
    exam_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)

    exam = relationship("Exam", back_populates="subjects")
    marks = relationship("Mark", back_populates="exam_subject", cascade="all, delete-orphan")


class Mark(Base, TimestampMixin):
    __tablename__ = "marks"

    id = Column(Integer, primary_key=True, index=True)
    exam_subject_id = Column(Integer, ForeignKey("exam_subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    marks_obtained = Column(Float, nullable=True)
    is_absent = Column(Boolean, default=False, nullable=False)
    remarks = Column(String(255), nullable=True)
    evaluated_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    __table_args__ = (
        UniqueConstraint("exam_subject_id", "student_id", name="uq_mark_subject_student"),
    )

    exam_subject = relationship("ExamSubject", back_populates="marks")
