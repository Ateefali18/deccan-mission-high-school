from sqlalchemy import Column, Integer, String, Boolean, Text
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin

class School(Base, TimestampMixin):
    __tablename__ = "schools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    affiliation_number = Column(String(100), nullable=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    timezone = Column(String(50), default="Asia/Kolkata", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    academic_years = relationship("AcademicYear", back_populates="school", cascade="all, delete-orphan")
    users = relationship("User", back_populates="school", cascade="all, delete-orphan")
    classes = relationship("Class", back_populates="school", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="school")
