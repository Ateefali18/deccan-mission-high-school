from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from app.db.session import Base
from app.models.base import TimestampMixin, utc_now

class Notice(Base, TimestampMixin):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, ForeignKey("schools.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    target_audience = Column(String(50), default="all", nullable=False) # all, teachers, students, parents
    priority = Column(String(20), default="normal", nullable=False) # normal, high, urgent
    is_published = Column(Boolean, default=True, nullable=False)
    publish_date = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
