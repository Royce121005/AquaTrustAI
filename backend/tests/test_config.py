"""Tests for backend configuration loading and validation."""

import pytest
from pydantic import ValidationError
from app.core.config import Settings


def test_default_settings():
    """Verify default settings initialization."""
    settings = Settings()
    assert settings.APP_NAME == "AquaTrust AI Backend"
    assert settings.API_V1_STR == "/api/v1"
    assert settings.APP_PORT == 8000
    assert isinstance(settings.CORS_ORIGINS, list)


def test_cors_origins_parsing():
    """Verify comma-separated CORS origins parsing."""
    settings = Settings(CORS_ORIGINS="http://localhost:3000, http://localhost:5173")
    assert "http://localhost:3000" in settings.CORS_ORIGINS
    assert "http://localhost:5173" in settings.CORS_ORIGINS
    assert len(settings.CORS_ORIGINS) == 2


def test_app_env_validation():
    """Verify APP_ENV rejects invalid deployment targets."""
    with pytest.raises(ValidationError):
        Settings(APP_ENV="invalid_env")  # type: ignore


def test_log_level_validation():
    """Verify LOG_LEVEL rejects invalid log levels."""
    with pytest.raises(ValidationError):
        Settings(LOG_LEVEL="INVALID_LEVEL")  # type: ignore
