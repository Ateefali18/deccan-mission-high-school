from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.search import SearchResponse
from app.services.search_service import SearchService

router = APIRouter()

@router.get("/", response_model=SearchResponse)
def search_school_data(
    q: str = Query(..., min_length=1, description="Search by student admission no/name or teacher employee ID/name"),
    limit: int = Query(15, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return SearchService.search(db, current_user, query_text=q, limit=limit)
