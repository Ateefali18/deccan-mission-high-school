from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.session import Base

def utc_now():
    return datetime.now(timezone.utc)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False)  # LOGIN, LOGOUT, CREATE_USER, ENROLL_STUDENT, etc.
    resource_type = Column(String(100), nullable=True)  # User, StudentProfile, Class, etc.
    resource_id = Column(String(100), nullable=True)
    details = Column(Text, nullable=True)  # JSON or descriptive text
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    # Relationships
    school = relationship("School", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")
