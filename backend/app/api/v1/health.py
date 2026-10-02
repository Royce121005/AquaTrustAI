"""AquaTrust AI — Health and Readiness Endpoints.

Implements GET /health and GET /api/v1/health conforming to
MASTER/API_ENDPOINT_REGISTRY.md.
"""

from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.db.session import check_db_connection

router = APIRouter(tags=["health"])
settings = get_settings()


class HealthResponse(BaseModel):
    """Health check response DTO."""

    status: str = Field(default="healthy", description="Service health state", examples=["healthy"])
    app_name: str = Field(..., description="Application name")
    environment: str = Field(..., description="Deployment environment")
    version: str = Field(default="0.1.0", description="Backend version")
    timestamp: str = Field(..., description="ISO-8601 UTC timestamp")
    database: str = Field(..., description="Database connection state", examples=["connected", "disconnected"])


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Service Health Check",
    description="Returns backend operational status and database readiness.",
)
def get_health() -> Dict[str, Any]:
    """Health check endpoint accessible without authentication."""
    db_ok = check_db_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "connected" if db_ok else "disconnected",
    }


@router.get(
    "/",
    status_code=status.HTTP_200_OK,
    summary="Root Service Index",
    description="Returns backend identification and status.",
)
def get_root() -> Dict[str, Any]:
    """Root endpoint providing service identity and health links."""
    return {
        "service": settings.APP_NAME,
        "status": "online",
        "version": "0.1.0",
        "api_v1": f"{settings.API_V1_STR}",
        "docs": "/docs",
        "health": "/health",
    }

