"""AquaTrust AI — Security and RBAC Test Suite.

Tests for:
- M2-21: Authentication & RBAC Service & Routes
- M2-23: Security & RBAC Unit Tests
"""

import pytest
from datetime import timedelta
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import get_db, engine
from app.models import Base
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
    require_role,
)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_password_hashing_and_verification():
    """Verify bcrypt password hashing and verification."""
    password = "SuperSecretSecurePassword!2026"
    pwd_hash = get_password_hash(password)
    assert pwd_hash != password
    assert verify_password(password, pwd_hash) is True
    assert verify_password("WrongPassword", pwd_hash) is False


def test_jwt_token_lifecycle():
    """Verify JWT token generation, signature validation, and expiration."""
    payload = {"sub": "operator_delhi", "role": "operator", "facility_id": "FAC-01"}
    token = create_access_token(payload, expires_delta=timedelta(minutes=15))
    assert isinstance(token, str)

    decoded = decode_access_token(token)
    assert decoded["sub"] == "operator_delhi"
    assert decoded["role"] == "operator"

    # Test expired token
    expired_token = create_access_token(payload, expires_delta=timedelta(seconds=-10))
    with pytest.raises(HTTPException) as exc:
        decode_access_token(expired_token)
    assert exc.value.status_code == 401


def test_rbac_role_checker_guard():
    """Verify require_role dependency allows permitted roles and denies unauthorized roles."""
    guard = require_role(["auditor", "admin"])

    # Allowed role: auditor
    claims_auditor = {"sub": "auditor_user", "role": "auditor"}
    assert guard(claims_auditor) == claims_auditor

    # Allowed role: admin
    claims_admin = {"sub": "admin_user", "role": "admin"}
    assert guard(claims_admin) == claims_admin

    # Denied role: operator
    claims_operator = {"sub": "op_user", "role": "operator"}
    with pytest.raises(HTTPException) as exc:
        guard(claims_operator)
    assert exc.value.status_code == 403


def test_auth_login_endpoints(client: TestClient, db_session: Session):
    """Test login with demo users and profile retrieval."""
    # 1. Successful Login as Operator
    resp = client.post("/api/v1/auth/login", json={"username": "operator", "password": "operator123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["role"] == "operator"
    token = data["access_token"]

    # 2. Get Me / Profile with Bearer token
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == "operator"
    assert me_data["role"] == "operator"

    # 3. Invalid Credentials Login
    bad_resp = client.post("/api/v1/auth/login", json={"username": "operator", "password": "wrongpassword"})
    assert bad_resp.status_code == 401

    # 4. Register new user
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "username": "custom_operator",
            "email": "custom@aquatrust.internal",
            "password": "CustomPassword123!",
            "role": "operator",
        },
    )
    assert reg_resp.status_code == 201
    assert reg_resp.json()["username"] == "custom_operator"

    # 5. Login as newly registered user
    reg_login_resp = client.post(
        "/api/v1/auth/login",
        json={"username": "custom_operator", "password": "CustomPassword123!"},
    )
    assert reg_login_resp.status_code == 200
    assert reg_login_resp.json()["username"] == "custom_operator"
