"""AquaTrust AI — API Router Aggregation.

Mounts versioned API routers conforming to MASTER/API_ENDPOINT_REGISTRY.md.
"""

from fastapi import APIRouter
from app.api.v1.health import router as health_router

api_router = APIRouter()

# Mount health endpoint under /api/v1
api_router.include_router(health_router, prefix="", tags=["health"])
