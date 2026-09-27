"""Pytest configuration and test fixtures for AquaTrust AI Backend."""

import os
import pytest
from typing import AsyncGenerator, Generator
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Force test environment settings before importing app modules
os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "postgresql://aquatrust_user:aquatrust_password@localhost:5432/aquatrust_db"
os.environ["LOG_LEVEL"] = "DEBUG"
os.environ["LOG_FORMAT"] = "text"

from app.core.config import Settings, get_settings
from app.db.base import Base
from app.db.session import get_db
from app.main import create_application


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    """Provide verified test settings."""
    return Settings(
        APP_ENV="test",
        DATABASE_URL="postgresql://aquatrust_user:aquatrust_password@localhost:5432/aquatrust_db",
        DEBUG=True,
        LOG_LEVEL="DEBUG",
        LOG_FORMAT="text",
    )


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide database session fixture for persistence boundary testing."""
    session = Session()
    yield session
    session.close()


@pytest.fixture
def app(db_session: Session):
    """Provide FastAPI test application with overridden database session."""
    application = create_application()

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    application.dependency_overrides[get_db] = override_get_db
    return application


@pytest.fixture
def sync_client(app) -> Generator[TestClient, None, None]:
    """Synchronous test client for rapid HTTP assertions."""
    with TestClient(app) as client:
        yield client


@pytest.fixture
async def async_client(app) -> AsyncGenerator[AsyncClient, None]:
    """Asynchronous HTTP test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
