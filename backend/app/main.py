import os
import sys

# Ensure repository root and backend directory are in sys.path for ml and datasets imports
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from dotenv import load_dotenv
env_path = os.path.join(backend_root, ".env")
if os.path.isfile(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.api.v1.health import router as health_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import get_logger, setup_logging
from app.core.middleware import RequestIDMiddleware, SecurityHeadersMiddleware
from app.db.session import check_db_connection

settings = get_settings()

# Initialize structured logging foundation
setup_logging(log_level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
logger = get_logger("aquatrust.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Handle deterministic application startup and shutdown lifecycles."""
    logger.info(
        f"Starting {settings.APP_NAME} in '{settings.APP_ENV}' environment...",
        extra={"app_env": settings.APP_ENV, "debug": settings.DEBUG},
    )

    # Validate database connectivity boundary at startup
    db_connected = check_db_connection()
    if db_connected:
        logger.info("Database connectivity verified successfully.")
        try:
            from app.models import Base
            from app.db.session import engine, SessionLocal
            from app.api.v1.auth import seed_default_users

            Base.metadata.create_all(bind=engine)
            with SessionLocal() as session:
                seed_default_users(session)
            logger.info("Database schema and core authentication accounts verified successfully.")
        except Exception as exc:
            logger.warning(f"Database schema initialization notice: {exc}")
    else:
        logger.warning("Database is currently unreachable. Operating in degraded state.")

    yield

    logger.info(f"Shutting down {settings.APP_NAME}...")


def create_application() -> FastAPI:
    """Factory creating configured FastAPI instance with all middlewares and routers."""
    app = FastAPI(
        title=settings.APP_NAME,
        version="0.1.0",
        description="AquaTrust AI — Water Treatment Intelligence & Traceability Platform API",
        docs_url="/docs" if settings.DEBUG or settings.APP_ENV != "production" else None,
        redoc_url="/redoc" if settings.DEBUG or settings.APP_ENV != "production" else None,
        openapi_url="/openapi.json" if settings.DEBUG or settings.APP_ENV != "production" else None,
        lifespan=lifespan,
    )

    # 1. Custom Request ID Middleware
    app.add_middleware(RequestIDMiddleware)

    # 2. Security Headers Middleware (OWASP recommended)
    app.add_middleware(SecurityHeadersMiddleware)

    # 3. CORS Middleware
    raw_cors = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
    if "*" in raw_cors:
        origins_to_pass = ["*"]
        allow_origin_regex = None
        allow_credentials = False  # Wildcard origins require allow_credentials=False per CORS spec
    else:
        origins_to_pass = raw_cors
        allow_origin_regex = None
        allow_credentials = True

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins_to_pass,
        allow_origin_regex=allow_origin_regex,
        allow_credentials=allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # 4. Exception Handlers
    register_exception_handlers(app)

    # 4. Mount API routers
    # Mount base /health endpoint
    app.include_router(health_router, prefix="", tags=["health"])
    # Mount versioned API routes under /api/v1
    app.include_router(api_router, prefix=settings.API_V1_STR)

    return app


app = create_application()
