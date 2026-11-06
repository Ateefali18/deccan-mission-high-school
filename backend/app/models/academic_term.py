from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin

class AcademicTerm(Base, TimestampMixin):
    __tablename__ = "academic_terms"

    id = Column(Integer, primary_key=True, index=True)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)  # e.g. "Term 1 (FA1 + SA1)"
    term_type = Column(String(50), default="term", nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=False, nullable=False)
    status = Column(String(20), default="active", nullable=False)

    __table_args__ = (
        UniqueConstraint("academic_year_id", "name", name="uq_ay_term_name"),
    )
