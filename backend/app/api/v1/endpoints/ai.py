from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.api import deps
from app.db.session import get_db
from app.models.user import User
from app.models.ai import AIConversation, AIMessage
from app.services.ai_service import AIService

router = APIRouter()

class AIQueryRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=500, description="Natural language question")
    conversation_id: Optional[int] = Field(None, description="Optional existing conversation thread")

class AIQueryResponse(BaseModel):
    answer: str
    data: Optional[Any] = None
    source: str
    route: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    conversation_id: Optional[int] = None

@router.post("/query", response_model=AIQueryResponse)
def query_ai_assistant(
    payload: AIQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Authorized School AI Assistant Endpoint:
    Interprets natural language questions, strictly enforces the caller's role-based access scope,
    executes verified read-only queries, and returns grounded facts with actionable navigation links.
    """
    # 1. Resolve or create conversation
    conv_id = payload.conversation_id
    if not conv_id:
        new_conv = AIConversation(
            user_id=current_user.id,
            title=payload.question[:60],
        )
        db.add(new_conv)
        db.flush()
        conv_id = new_conv.id
    else:
        existing_conv = db.query(AIConversation).filter(
            AIConversation.id == conv_id,
            AIConversation.user_id == current_user.id,
        ).first()
        if not existing_conv:
            new_conv = AIConversation(user_id=current_user.id, title=payload.question[:60])
            db.add(new_conv)
            db.flush()
            conv_id = new_conv.id

    # 2. Record user message
    user_msg = AIMessage(
        conversation_id=conv_id,
        role="user",
        content=payload.question,
    )
    db.add(user_msg)

    # 3. Execute authorized query
    result = AIService.execute_query(db, current_user, payload.question)

    # 4. Record assistant response
    assistant_msg = AIMessage(
        conversation_id=conv_id,
        role="assistant",
        content=result["answer"],
    )
    db.add(assistant_msg)
    db.commit()

    return AIQueryResponse(
        answer=result["answer"],
        data=result.get("data"),
        source=result.get("source", "DMHS Relational Database"),
        route=result.get("route"),
        filters=result.get("filters"),
        conversation_id=conv_id,
    )

@router.get("/conversations", response_model=List[Dict[str, Any]])
def get_user_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Retrieve user's past AI assistant conversations.
    """
    convs = (
        db.query(AIConversation)
        .filter(AIConversation.user_id == current_user.id)
        .order_by(AIConversation.created_at.desc())
        .limit(10)
        .all()
    )
    return [{"id": c.id, "title": c.title, "created_at": c.created_at.isoformat()} for c in convs]
