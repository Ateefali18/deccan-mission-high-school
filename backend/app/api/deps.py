from typing import Generator, Optional
from fastapi import Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.config import settings
from app.core.security import decode_access_token
from app.core.exceptions import AuthenticationException, PermissionDeniedException
from app.models.user import User
from app.permissions.rules import PermissionService

bearer_scheme = HTTPBearer(auto_error=False)

def get_current_token(
    request: Request,
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    # 1. Prefer Authorization: Bearer <token>
    if auth_header and auth_header.credentials:
        return auth_header.credentials

    # 2. Check HttpOnly cookie
    cookie_token = request.cookies.get(settings.COOKIE_NAME)
    if cookie_token:
        return cookie_token

    raise AuthenticationException("Authentication required. Please sign in.")

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(get_current_token),
) -> User:
    payload = decode_access_token(token)
    if not payload:
        raise AuthenticationException("Invalid or expired session token.")

    user_id = payload.get("user_id")
    if not user_id:
        raise AuthenticationException("Malformed authentication token.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise AuthenticationException("User account does not exist.")

    if not user.is_active:
        raise PermissionDeniedException("Account has been deactivated. Please contact administration.")

    return user

get_current_active_user = get_current_user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    PermissionService.require_roles(current_user, ["ADMIN"])
    return current_user

def require_teacher(current_user: User = Depends(get_current_user)) -> User:
    PermissionService.require_roles(current_user, ["TEACHER", "ADMIN"])
    return current_user

def require_student(current_user: User = Depends(get_current_user)) -> User:
    PermissionService.require_roles(current_user, ["STUDENT", "ADMIN"])
    return current_user
