from fastapi import APIRouter, Depends, Response, Request, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.api.deps import get_current_user
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.auth import LoginRequest, TokenResponse, CurrentUserResponse
from app.services.auth_service import AuthService

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else "unknown"
    user, token = AuthService.authenticate_user(
        db=db,
        username_or_email=payload.username_or_email,
        password=payload.password,
        ip_address=ip_address,
    )

    # Set HttpOnly, SameSite session cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    primary_role = "STUDENT"
    user_roles = user.roles
    if "ADMIN" in user_roles:
        primary_role = "ADMIN"
    elif "TEACHER" in user_roles:
        primary_role = "TEACHER"

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        role=primary_role,
        full_name=user.full_name,
        username=user.username,
    )

@router.post("/logout")
def logout(
    response: Response,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Log logout action
    ip_address = request.client.host if request.client else "unknown"
    db.add(AuditLog(
        school_id=current_user.school_id,
        user_id=current_user.id,
        action="LOGOUT",
        resource_type="User",
        resource_id=str(current_user.id),
        details="User logged out",
        ip_address=ip_address,
    ))
    db.commit()

    response.delete_cookie(key=settings.COOKIE_NAME)
    return {"message": "Successfully signed out."}

@router.get("/me", response_model=CurrentUserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return AuthService.get_current_user_profile(db, current_user)
