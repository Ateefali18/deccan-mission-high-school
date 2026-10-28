from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin

class Section(Base, TimestampMixin):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(50), nullable=False)  # e.g. "A", "B", "C"
    room_number = Column(String(50), nullable=True)
    capacity = Column(Integer, default=40, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    class_ = relationship("Class", back_populates="sections")
    enrollments = relationship("StudentEnrollment", back_populates="section")
    teacher_assignments = relationship("TeacherAssignment", back_populates="section")

    __table_args__ = (
        UniqueConstraint("class_id", "name", name="uq_class_section_name"),
    )
