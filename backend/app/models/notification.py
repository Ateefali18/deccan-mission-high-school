from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text
from app.db.session import Base
from app.models.base import TimestampMixin

class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info", nullable=False) # info, warning, alert, success
    is_read = Column(Boolean, default=False, nullable=False)
    link_url = Column(String(255), nullable=True)
