from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.base import TimestampMixin

class AIConversation(Base, TimestampMixin):
    __tablename__ = "ai_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), default="New School ERP Conversation", nullable=False)

    messages = relationship("AIMessage", back_populates="conversation", cascade="all, delete-orphan")


class AIMessage(Base, TimestampMixin):
    __tablename__ = "ai_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False) # user, assistant, system
    content = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=True)

    conversation = relationship("AIConversation", back_populates="messages")
    feedback = relationship("AIFeedback", back_populates="message", uselist=False, cascade="all, delete-orphan")


class AIFeedback(Base, TimestampMixin):
    __tablename__ = "ai_feedback"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("ai_messages.id", ondelete="CASCADE"), nullable=False, unique=True)
    rating = Column(Integer, nullable=False) # 1 or -1
    feedback_text = Column(String(255), nullable=True)

    message = relationship("AIMessage", back_populates="feedback")
