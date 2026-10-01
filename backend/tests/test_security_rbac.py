"""AquaTrust AI — Security and RBAC Test Suite.

Tests for:
- M2-21: Authentication & RBAC Service & Routes
- M2-23: Security & RBAC Unit Tests
- Zero-Trust unauthenticated request denial (401)
- Role matrix enforcement and unauthorized role denial (403)
- Account seeding and login lifecycle across all 4 roles
- Admin-only user registration
"""

import pytest
from datetime import timedelta
from uuid import uuid4
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import get_db, engine
from app.models import Base
from app.models.user import User, UserRole
from app.models.facility import Facility
from app.api.v1.auth import seed_default_users
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_access_token,
    require_role,
    get_current_user_claims,
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
    assert exc.value.headers.get("WWW-Authenticate") == "Bearer"


def test_rbac_role_checker_guard():
    """Verify require_role dependency allows permitted roles and denies unauthorized roles."""
    guard = require_role(["auditor", "admin"])

    # Allowed role: auditor
    claims_auditor = {"sub": "auditor_user", "role": "auditor"}
    assert guard(claims_auditor) == claims_auditor

    # Allowed role: admin (super-role)
    claims_admin = {"sub": "admin_user", "role": "admin"}
    assert guard(claims_admin) == claims_admin

    # Denied role: operator
    claims_operator = {"sub": "op_user", "role": "operator"}
    with pytest.raises(HTTPException) as exc:
        guard(claims_operator)
    assert exc.value.status_code == 403


def test_seed_default_users_database(db_session: Session):
    """Verify seed_default_users seeds operator, auditor, regulator, admin accounts."""
    seeded = seed_default_users(db_session)
    assert len(seeded) == 4

    users = db_session.query(User).all()
    usernames = {u.username for u in users}
    assert usernames == {"operator", "auditor", "regulator", "admin"}

    # Re-running seeder does not duplicate accounts
    seeded_again = seed_default_users(db_session)
    assert len(seeded_again) == 0


def test_all_four_roles_login_and_me_profiles(client: TestClient, db_session: Session):
    """Test successful authentication and profile inspection for all 4 defined roles."""
    roles_test = [
        ("operator", "operator123", UserRole.OPERATOR.value, "FAC-CPCB-001"),
        ("auditor", "auditor123", UserRole.AUDITOR.value, None),
        ("regulator", "regulator123", UserRole.REGULATORY_STAKEHOLDER.value, None),
        ("admin", "admin123", UserRole.ADMIN.value, None),
    ]

    for username, password, expected_role, expected_fac in roles_test:
        resp = client.post("/api/v1/auth/login", json={"username": username, "password": password})
        assert resp.status_code == 200, f"Login failed for {username}: {resp.text}"
        data = resp.json()
        assert data["username"] == username
        assert data["role"] == expected_role
        assert "access_token" in data
        token = data["access_token"]

        me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200, f"Me failed for {username}: {me_resp.text}"
        me_data = me_resp.json()
        assert me_data["username"] == username
        assert me_data["role"] == expected_role
        if expected_fac:
            assert me_data["facility_id"] == expected_fac


def test_invalid_credentials_returns_401(client: TestClient):
    """Assert incorrect credentials return 401 with WWW-Authenticate header."""
    resp = client.post("/api/v1/auth/login", json={"username": "operator", "password": "wrongpassword"})
    assert resp.status_code == 401
    assert resp.headers.get("WWW-Authenticate") == "Bearer"


def test_unauthenticated_requests_denied_401(client: TestClient):
    """Zero-Trust: verify that unauthenticated requests to protected endpoints return 401."""
    endpoints = [
        ("GET", "/api/v1/auth/me"),
        ("GET", "/api/v1/facilities"),
        ("POST", "/api/v1/facilities"),
        ("GET", "/api/v1/readings"),
        ("POST", "/api/v1/ingestion/readings"),
        ("POST", "/api/v1/ingestion/batch"),
        ("GET", "/api/v1/validation/stats"),
        ("GET", "/api/v1/anomalies/metrics"),
        ("POST", "/api/v1/simulator/start"),
        ("GET", "/api/v1/compliance/rules"),
        ("POST", "/api/v1/compliance/evaluate"),
        ("POST", "/api/v1/treatment-records/finalize"),
        ("GET", "/api/v1/treatment-records"),
        ("GET", "/api/v1/audit-events"),
        ("GET", "/api/v1/dlt/anchors"),
        ("POST", "/api/v1/corrections/propose"),
    ]

    for method, path in endpoints:
        if method == "GET":
            resp = client.get(path)
        else:
            resp = client.post(path, json={})
        assert resp.status_code == 401, f"Expected 401 for unauthenticated {method} {path}, got {resp.status_code}"
        assert resp.headers.get("WWW-Authenticate") == "Bearer"


def test_admin_only_user_registration(client: TestClient, db_session: Session):
    """Test RBAC on /api/v1/auth/register: anonymous->401, operator->403, admin->201."""
    new_user_payload = {
        "username": "new_auditor_user",
        "email": "auditor_new@cpcb.gov.in",
        "password": "SecurePassword123!",
        "role": "auditor",
        "display_name": "New Auditor",
    }

    # 1. Anonymous registration attempt -> 401
    anon_resp = client.post("/api/v1/auth/register", json=new_user_payload)
    assert anon_resp.status_code == 401

    # 2. Operator login and registration attempt -> 403
    op_login = client.post("/api/v1/auth/login", json={"username": "operator", "password": "operator123"})
    op_token = op_login.json()["access_token"]
    op_resp = client.post(
        "/api/v1/auth/register",
        json=new_user_payload,
        headers={"Authorization": f"Bearer {op_token}"},
    )
    assert op_resp.status_code == 403

    # 3. Admin login and registration attempt -> 201
    admin_login = client.post("/api/v1/auth/login", json={"username": "admin", "password": "admin123"})
    admin_token = admin_login.json()["access_token"]
    admin_resp = client.post(
        "/api/v1/auth/register",
        json=new_user_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_resp.status_code == 201
    assert admin_resp.json()["username"] == "new_auditor_user"
    assert admin_resp.json()["role"] == "auditor"

    # 4. Login as newly registered user
    new_login = client.post("/api/v1/auth/login", json={"username": "new_auditor_user", "password": "SecurePassword123!"})
    assert new_login.status_code == 200
    assert new_login.json()["role"] == "auditor"


def test_role_matrix_cross_enforcement_403(client: TestClient, db_session: Session):
    """Verify role matrix restricts unauthorized roles with 403 Forbidden."""
    # Obtain tokens for each role
    op_token = client.post("/api/v1/auth/login", json={"username": "operator", "password": "operator123"}).json()["access_token"]
    aud_token = client.post("/api/v1/auth/login", json={"username": "auditor", "password": "auditor123"}).json()["access_token"]
    reg_token = client.post("/api/v1/auth/login", json={"username": "regulator", "password": "regulator123"}).json()["access_token"]

    op_headers = {"Authorization": f"Bearer {op_token}"}
    aud_headers = {"Authorization": f"Bearer {aud_token}"}
    reg_headers = {"Authorization": f"Bearer {reg_token}"}

    # 1. POST /facilities requires admin -> operator/auditor should get 403
    fac_payload = {"facility_name": "Test STP", "facility_type": "municipal_stp", "location": {}}
    assert client.post("/api/v1/facilities", json=fac_payload, headers=op_headers).status_code == 403
    assert client.post("/api/v1/facilities", json=fac_payload, headers=aud_headers).status_code == 403

    # 2. GET /audit-events requires auditor/regulatory_stakeholder/admin -> operator gets 403, auditor & regulator get 200
    assert client.get("/api/v1/audit-events", headers=op_headers).status_code == 403
    assert client.get("/api/v1/audit-events", headers=aud_headers).status_code == 200
    assert client.get("/api/v1/audit-events", headers=reg_headers).status_code == 200

    # 3. POST /compliance/evaluate requires auditor/regulatory_stakeholder/admin -> operator gets 403
    eval_payload = {"treatment_record_id": str(uuid4())}
    assert client.post("/api/v1/compliance/evaluate", json=eval_payload, headers=op_headers).status_code == 403

    # 4. POST /treatment-records/finalize requires operator/admin -> auditor/regulator get 403
    fin_payload = {
        "facility_id": str(uuid4()),
        "period_start": "2026-01-01T00:00:00Z",
        "period_end": "2026-01-01T06:00:00Z",
    }
    assert client.post("/api/v1/treatment-records/finalize", json=fin_payload, headers=aud_headers).status_code == 403
    assert client.post("/api/v1/treatment-records/finalize", json=fin_payload, headers=reg_headers).status_code == 403

    # 5. POST /dlt/anchors/{id}/reconcile requires auditor/regulatory_stakeholder/admin -> operator gets 403
    dummy_id = uuid4()
    assert client.post(f"/api/v1/dlt/anchors/{dummy_id}/reconcile", headers=op_headers).status_code == 403


def test_public_routes_accessible_without_auth(client: TestClient):
    """Verify that public endpoints do not require authorization headers."""
    # Health checks
    assert client.get("/health").status_code == 200
    assert client.get("/api/v1/health").status_code == 200

    # Stateless proof verification is public
    proof_resp = client.post(
        "/api/v1/verification/verify-proof",
        json={
            "canonical_payload": {"test": "data"},
            "canonical_hash": "a" * 64,
            "signature": "sample-sig",
            "public_key_pem": "sample-key",
            "key_id": "key-ecdsa-p256-01",
        },
    )
    assert proof_resp.status_code == 200
    assert proof_resp.json()["verdict"] == "INVALID"


