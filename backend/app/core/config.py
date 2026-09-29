"""AquaTrust AI — Central Configuration Management.

Implements environment-driven, type-validated configuration adhering strictly to
MASTER/ARCHITECTURE_FREEZE.md, MASTER/SECURITY_RULES.md, and PHASE_01_FOUNDATION.md.
"""

from functools import lru_cache
from typing import List, Literal, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Authoritative backend application settings."""

    # Application identity
    APP_NAME: str = Field(default="AquaTrust AI Backend", description="Application name")
    APP_ENV: Literal["development", "test", "staging", "production"] = Field(
        default="development", description="Deployment environment"
    )
    DEBUG: bool = Field(default=False, description="Debug mode flag")
    APP_HOST: str = Field(default="0.0.0.0", description="Host address for server")
    APP_PORT: int = Field(default=8000, description="Port number for server")

    # API configuration
    API_V1_STR: str = Field(default="/api/v1", description="Base prefix for API v1 routes")

    # Logging configuration
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO", description="Global log level"
    )
    LOG_FORMAT: Literal["json", "text"] = Field(
        default="json", description="Log output format"
    )

    # Security & CORS
    CORS_ORIGINS: Union[List[str], str] = Field(
        default=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
        description="Allowed CORS origins",
    )

    # Database Persistence Boundary (PostgreSQL)
    # Default is a test-safe SQLite memory URL if PostgreSQL is not specified in test mode
    DATABASE_URL: str = Field(
        default="postgresql://aquatrust_user:aquatrust_password@localhost:5432/aquatrust_db",
        description="PostgreSQL database connection URL",
    )
    DB_POOL_SIZE: int = Field(default=5, description="Database connection pool size")
    DB_MAX_OVERFLOW: int = Field(default=10, description="Database pool max overflow")
    DB_ECHO: bool = Field(default=False, description="SQLAlchemy query echoing")

    # Security & JWT
    JWT_SECRET_KEY: str = Field(
        default="aquatrust-dev-secret-key-do-not-use-in-production-1234567890",
        description="Secret key for JWT token signing",
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT signing algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=480, description="Token expiry in minutes")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse comma-separated strings or preserve list of CORS origins."""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []


@lru_cache()
def get_settings() -> Settings:
    """Return cached singleton instance of validated settings."""
    return Settings()


settings = get_settings()
