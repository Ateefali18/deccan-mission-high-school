import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "Deccan Mission High School ERP"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Security & JWT
    SECRET_KEY: str = "CHANGE_THIS_IN_PRODUCTION_SUPER_SECRET_KEY_FOR_DMHS_2026_ERP"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    COOKIE_NAME: str = "dmhs_session"
    COOKIE_SECURE: bool = False  # Set to True in production HTTPS
    COOKIE_SAMESITE: str = "lax"

    # School defaults
    SCHOOL_NAME: str = "Deccan Mission High School"
    SCHOOL_CODE: str = "DMHS-HYD"
    TIMEZONE: str = "Asia/Kolkata"
    AFFILIATION_NUMBER: str = "TS-HYD-CBSE-41092"
    CONTACT_EMAIL: str = "admin@deccanmission.edu.in"
    CONTACT_PHONE: str = "+91 40 2456 7890"
    ADDRESS: str = "Old City, Hyderabad, Telangana 500002, India"

    # Database: SQLite fallback for local test/dev, PostgreSQL for production
    DATABASE_URL: str = "sqlite:///./dmhs.db"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5180",
        "http://127.0.0.1:5180",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # First Admin Bootstrap (Refuses overwrite if admin already exists)
    BOOTSTRAP_ADMIN_EMAIL: str = "admin@dmhs.edu.in"
    BOOTSTRAP_ADMIN_USERNAME: str = "admin"
    BOOTSTRAP_ADMIN_PASSWORD: str = ""  # Must be provided explicitly via env or CLI prompt
    BOOTSTRAP_ADMIN_NAME: str = "Principal & Chief Administrator"

    # Rate limiting configuration (requests per minute for sensitive endpoints)
    LOGIN_RATE_LIMIT_PER_MINUTE: int = 15

    # AI Assistant Provider Configuration
    AI_PROVIDER: str = "gemini"  # gemini, openai, anthropic, or local
    AI_MODEL: str = "gemini-1.5-pro"
    AI_API_KEY: str = ""

    # Attendance Calculation Configuration
    ATTENDANCE_LATE_WEIGHT: float = 1.0  # Count late as present (1.0) or custom (e.g. 0.5)
    ATTENDANCE_EXCUSED_IN_DENOMINATOR: bool = False  # Excused absences excluded from denominator by default


settings = Settings()
