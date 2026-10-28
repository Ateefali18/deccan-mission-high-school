import time
from collections import defaultdict
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.role import Role, UserRole
from app.models.school import School
from app.models.audit_log import AuditLog
from app.core.security import verify_password, create_access_token
from app.core.exceptions import AuthenticationException
from app.schemas.auth import TokenResponse, CurrentUserResponse, UserProfileResponse

# In-memory sliding window rate limiter for login attempts per IP
# (Production can use Redis or cache table)
_login_attempts: Dict[str, List[float]] = defaultdict(list)

class AuthService:
    @staticmethod
    def check_rate_limit(ip: str, max_attempts: int = 15, window_seconds: int = 60) -> None:
        now = time.time()
        # Clean older entries
        attempts = [t for t in _login_attempts[ip] if now - t < window_seconds]
        _login_attempts[ip] = attempts
        if len(attempts) >= max_attempts:
            raise AuthenticationException("Too many login attempts. Please wait a minute before trying again.")
        _login_attempts[ip].append(now)

    @staticmethod
    def authenticate_user(
        db: Session,
        username_or_email: str,
        password: str,
        ip_address: Optional[str] = None
    ) -> Tuple[User, str]:
        # Rate limiting check
        if ip_address:
            AuthService.check_rate_limit(ip_address)

        # Lookup by username or email
        user = db.query(User).filter(
            (User.username == username_or_email) | (User.email == username_or_email)
        ).first()

        if not user or not verify_password(password, user.hashed_password):
            # Log failed attempt
            if user:
                log = AuditLog(
                    school_id=user.school_id,
                    user_id=user.id,
                    action="LOGIN_FAILED",
                    resource_type="User",
                    resource_id=str(user.id),
                    details="Invalid password attempt",
                    ip_address=ip_address,
                )
                db.add(log)
                db.commit()
            raise AuthenticationException("Invalid username/email or password.")

        if not user.is_active:
            raise AuthenticationException("This account is currently inactive. Contact school administration.")

        # Determine primary role (Priority: ADMIN > TEACHER > STUDENT)
        user_roles = user.roles
        primary_role = "STUDENT"
        if "ADMIN" in user_roles:
            primary_role = "ADMIN"
        elif "TEACHER" in user_roles:
            primary_role = "TEACHER"
        elif "STUDENT" in user_roles:
            primary_role = "STUDENT"
        elif user_roles:
            primary_role = user_roles[0]

        # Update last_login_at
        user.last_login_at = datetime.now(timezone.utc)
        
        # Log successful login
        log = AuditLog(
            school_id=user.school_id,
            user_id=user.id,
            action="LOGIN_SUCCESS",
            resource_type="User",
            resource_id=str(user.id),
            details=f"User signed into {primary_role} portal",
            ip_address=ip_address,
        )
        db.add(log)
        db.commit()
        db.refresh(user)

        token = create_access_token(
            subject=user.username,
            role=primary_role,
            school_id=user.school_id,
            user_id=user.id,
        )

        return user, token

    @staticmethod
    def get_current_user_profile(db: Session, user: User) -> CurrentUserResponse:
        school = db.query(School).filter(School.id == user.school_id).first()
        school_name = school.name if school else "Deccan Mission High School"
        school_code = school.code if school else "DMHS-HYD"

        primary_role = "STUDENT"
        user_roles = user.roles
        if "ADMIN" in user_roles:
            primary_role = "ADMIN"
        elif "TEACHER" in user_roles:
            primary_role = "TEACHER"

        profile_id = None
        identifier = None
        if user.student_profile:
            profile_id = user.student_profile.id
            identifier = user.student_profile.admission_number
        elif user.teacher_profile:
            profile_id = user.teacher_profile.id
            identifier = user.teacher_profile.employee_id

        user_profile = UserProfileResponse(
            id=user.id,
            school_id=user.school_id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            phone_number=user.phone_number,
            is_active=user.is_active,
            roles=user.roles,
            last_login_at=user.last_login_at,
        )

        return CurrentUserResponse(
            user=user_profile,
            role=primary_role,
            school_name=school_name,
            school_code=school_code,
            profile_id=profile_id,
            identifier=identifier,
        )
