import os
import sys

repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

import pytest
from typing import AsyncGenerator, Generator
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

# Force test environment settings before importing app modules
os.environ["APP_ENV"] = "test"
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
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


@pytest.fixture(scope="session")
def is_postgres_available() -> bool:
    """Check whether a live PostgreSQL instance is available via TEST_POSTGRES_URL."""
    postgres_url = os.getenv("TEST_POSTGRES_URL")
    if not postgres_url:
        return False
    try:
        engine = create_engine(postgres_url, connect_args={"connect_timeout": 3})
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


from sqlalchemy.pool import StaticPool


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide an isolated in-memory SQLite database session with all tables created."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


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


from app.core.security import create_access_token
from app.models.user import UserRole


@pytest.fixture
def operator_token() -> str:
    """Generate authentic JWT token with operator role."""
    return create_access_token({
        "sub": "operator",
        "username": "operator",
        "role": UserRole.OPERATOR.value,
        "facility_id": "FAC-CPCB-001",
    })


@pytest.fixture
def auditor_token() -> str:
    """Generate authentic JWT token with auditor role."""
    return create_access_token({
        "sub": "auditor",
        "username": "auditor",
        "role": UserRole.AUDITOR.value,
        "facility_id": None,
    })


@pytest.fixture
def regulator_token() -> str:
    """Generate authentic JWT token with regulatory_stakeholder role."""
    return create_access_token({
        "sub": "regulator",
        "username": "regulator",
        "role": UserRole.REGULATORY_STAKEHOLDER.value,
        "facility_id": None,
    })


@pytest.fixture
def admin_token() -> str:
    """Generate authentic JWT token with admin role."""
    return create_access_token({
        "sub": "admin",
        "username": "admin",
        "role": UserRole.ADMIN.value,
        "facility_id": None,
    })


@pytest.fixture
def operator_auth_headers(operator_token: str) -> dict:
    """Provide Bearer auth headers for operator."""
    return {"Authorization": f"Bearer {operator_token}"}


@pytest.fixture
def auditor_auth_headers(auditor_token: str) -> dict:
    """Provide Bearer auth headers for auditor."""
    return {"Authorization": f"Bearer {auditor_token}"}


@pytest.fixture
def regulator_auth_headers(regulator_token: str) -> dict:
    """Provide Bearer auth headers for regulatory stakeholder."""
    return {"Authorization": f"Bearer {regulator_token}"}


@pytest.fixture
def admin_auth_headers(admin_token: str) -> dict:
    """Provide Bearer auth headers for admin."""
    return {"Authorization": f"Bearer {admin_token}"}

