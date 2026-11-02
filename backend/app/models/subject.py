from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint, Float
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin

class Subject(Base, TimestampMixin):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False)
    department = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("school_id", "code", name="uq_school_subject_code"),
    )

class ClassSubject(Base, TimestampMixin):
    __tablename__ = "class_subjects"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    is_elective = Column(Boolean, default=False, nullable=False)

    __table_args__ = (
        UniqueConstraint("class_id", "subject_id", name="uq_class_subject"),
    )

class GradingScale(Base, TimestampMixin):
    __tablename__ = "grading_scales"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False, default="Telangana SSC 9-Point Scale")
    grade = Column(String(10), nullable=False)  # A1, A2, B1, B2, C1, C2, D, E1, E2
    min_percentage = Column(Float, nullable=False)
    max_percentage = Column(Float, nullable=False)
    grade_point = Column(Float, nullable=True)
