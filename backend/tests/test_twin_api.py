"""AquaTrust AI — Digital Twin FastAPI Endpoints & RBAC Security Tests.

Verifies:
1. All digital twin REST endpoints and typed response contracts
2. Server-side RBAC permissions (Operator, Admin, Auditor, CPCB Regulator)
3. Cross-facility access denial for scoped operators (HTTP 403)
4. Unauthenticated access denial (HTTP 401)
5. Configuration mutation protection (Operator blocked 403, Admin allowed 200)
6. What-if scenario execution, listing, and comparative results
7. Predictions, recommendations, and sustainability calculations
"""

import pytest
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import uuid4, UUID
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import engine, get_db
from app.models import Base
from app.models.facility import Facility
from app.models.user import User, UserRole
from app.core.security import get_current_user_claims, create_access_token


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


@pytest.fixture
def test_facility_a(db_session: Session) -> Facility:
    fac = Facility(
        facility_id=uuid4(),
        facility_name="STP Plant Alpha",
        facility_type="municipal_stp",
        location={"city": "Delhi"},
        capacity=Decimal("100.000000"),
        capacity_unit="MLD",
        status="active",
    )
    db_session.add(fac)
    db_session.commit()
    return fac


@pytest.fixture
def test_facility_b(db_session: Session) -> Facility:
    fac = Facility(
        facility_id=uuid4(),
        facility_name="STP Plant Beta",
        facility_type="industrial_etp",
        location={"city": "Mumbai"},
        capacity=Decimal("50.000000"),
        capacity_unit="MLD",
        status="active",
    )
    db_session.add(fac)
    db_session.commit()
    return fac


def get_auth_headers(role: str, facility_id: Optional[UUID] = None, username: str = "testuser") -> dict:
    token = create_access_token({
        "sub": username,
        "username": username,
        "role": role,
        "facility_id": str(facility_id) if facility_id else None,
    })
    return {"Authorization": f"Bearer {token}"}


def test_unauthenticated_requests_return_401(client: TestClient, test_facility_a: Facility):
    """Verify that accessing digital twin endpoints without JWT returns 401."""
    fac_id = str(test_facility_a.facility_id)
    resp = client.get(f"/api/v1/facilities/{fac_id}/twin")
    assert resp.status_code == 401


def test_get_facility_twin_state(client: TestClient, test_facility_a: Facility):
    """Verify state retrieval returns valid virtual STP snapshot and stage states."""
    fac_id = str(test_facility_a.facility_id)
    headers = get_auth_headers("operator", facility_id=test_facility_a.facility_id)

    resp = client.get(f"/api/v1/facilities/{fac_id}/twin", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["facility_id"] == fac_id
    assert data["state_version"] >= 1
    assert data["state_freshness"] == "fresh"
    assert "inlet" in data["stage_states"]
    assert "final_effluent" in data["stage_states"]
    assert "process_model" in data


def test_cross_facility_operator_access_denied_403(
    client: TestClient,
    test_facility_a: Facility,
    test_facility_b: Facility,
):
    """Verify that an operator scoped to Facility A cannot access Facility B (HTTP 403)."""
    headers = get_auth_headers("operator", facility_id=test_facility_a.facility_id)
    fac_b_id = str(test_facility_b.facility_id)

    resp = client.get(f"/api/v1/facilities/{fac_b_id}/twin", headers=headers)
    assert resp.status_code == 403
    err_body = resp.json()
    assert "Cross-facility access denied" in (err_body.get("message") or err_body.get("detail", ""))


def test_configuration_management_rbac(client: TestClient, test_facility_a: Facility):
    """Verify that Operator gets 403 on PUT /config while Admin gets 200."""
    fac_id = str(test_facility_a.facility_id)
    op_headers = get_auth_headers("operator", facility_id=test_facility_a.facility_id)
    admin_headers = get_auth_headers("admin")

    update_payload = {"technology_type": "membrane_bioreactor_mbr"}

    # 1. Operator attempt -> 403 Forbidden
    op_resp = client.put(f"/api/v1/facilities/{fac_id}/twin/config", json=update_payload, headers=op_headers)
    assert op_resp.status_code == 403

    # 2. Admin attempt -> 200 OK
    admin_resp = client.put(f"/api/v1/facilities/{fac_id}/twin/config", json=update_payload, headers=admin_headers)
    assert admin_resp.status_code == 200
    assert admin_resp.json()["technology_type"] == "membrane_bioreactor_mbr"
    assert admin_resp.json()["version"] >= 2


def test_what_if_scenario_api_lifecycle(client: TestClient, test_facility_a: Facility):
    """Verify scenario creation, comparative time-series retrieval, and listing."""
    fac_id = str(test_facility_a.facility_id)
    headers = get_auth_headers("operator", facility_id=test_facility_a.facility_id)

    # 1. Create and execute scenario
    scen_payload = {
        "scenario_type": "influent_quality_change",
        "scenario_name": "Organic Shock +50%",
        "duration_minutes": 60,
        "time_step_seconds": 900,
        "parameters": {"bod_change_percent": 50.0},
        "seed": 42,
    }
    create_resp = client.post(f"/api/v1/facilities/{fac_id}/twin/scenarios", json=scen_payload, headers=headers)
    assert create_resp.status_code == 201
    scen_data = create_resp.json()
    assert scen_data["status"] == "completed"
    scen_id = scen_data["scenario_id"]
    assert len(scen_data["results"]) > 0

    # 2. Retrieve scenario by ID
    get_resp = client.get(f"/api/v1/twin/scenarios/{scen_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["scenario_id"] == scen_id

    # 3. List scenarios for facility
    list_resp = client.get(f"/api/v1/facilities/{fac_id}/twin/scenarios", headers=headers)
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] >= 1


def test_predictions_and_recommendations_endpoints(client: TestClient, test_facility_a: Facility):
    """Verify predictions, recommendations, sustainability, and model registry endpoints."""
    fac_id = str(test_facility_a.facility_id)
    headers = get_auth_headers("operator", facility_id=test_facility_a.facility_id)

    # 1. Predictions
    pred_resp = client.get(f"/api/v1/facilities/{fac_id}/twin/predictions", headers=headers)
    assert pred_resp.status_code == 200
    assert pred_resp.json()["status"] in ["ready", "insufficient_data"]

    # 2. Recommendations
    rec_resp = client.get(f"/api/v1/facilities/{fac_id}/twin/recommendations", headers=headers)
    assert rec_resp.status_code == 200
    assert isinstance(rec_resp.json(), list)

    # 3. Sustainability
    sus_resp = client.get(f"/api/v1/facilities/{fac_id}/twin/sustainability", headers=headers)
    assert sus_resp.status_code == 200
    sus_data = sus_resp.json()
    assert "reuse_volume_m3_day" in sus_data
    assert sus_data["safe_reuse_gate"] in ["PASSED", "HELD"]
    assert "annual_freshwater_saved_m3" in sus_data
    assert "reuse_applications" in sus_data
    assert isinstance(sus_data["reuse_applications"], list)
    assert "safe_reuse_gate_details" in sus_data

    # 4. Model Registry
    models_resp = client.get("/api/v1/twin/models", headers=headers)
    assert models_resp.status_code == 200
    assert len(models_resp.json()) >= 1
    assert any(m["model_type"] == "process_model" for m in models_resp.json())


def test_auditor_and_regulator_read_access(client: TestClient, test_facility_a: Facility):
    """Verify Auditor and CPCB Regulator roles can inspect twin evidence and models."""
    fac_id = str(test_facility_a.facility_id)
    aud_headers = get_auth_headers("auditor")
    reg_headers = get_auth_headers("regulatory_stakeholder")

    # Auditor can inspect state and history
    assert client.get(f"/api/v1/facilities/{fac_id}/twin", headers=aud_headers).status_code == 200
    assert client.get(f"/api/v1/facilities/{fac_id}/twin/history", headers=aud_headers).status_code == 200

    # Regulator can inspect state and sustainability
    assert client.get(f"/api/v1/facilities/{fac_id}/twin", headers=reg_headers).status_code == 200
    assert client.get(f"/api/v1/facilities/{fac_id}/twin/sustainability", headers=reg_headers).status_code == 200

    # Auditor cannot run scenarios (Operator/Admin only)
    scen_payload = {"scenario_type": "influent_quality_change"}
    assert client.post(f"/api/v1/facilities/{fac_id}/twin/scenarios", json=scen_payload, headers=aud_headers).status_code == 403


def test_empirical_model_evaluation_endpoint(client: TestClient):
    """Verify Admin can trigger offline empirical model evaluation against held-out dataset."""
    admin_headers = get_auth_headers("admin")
    resp = client.post("/api/v1/twin/models/evaluate", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ["evaluated", "dataset_not_found"]
    if data["status"] == "evaluated":
        assert "metrics" in data
        # Independent mathematical invariants: RMSE >= MAE > 0 for all evaluated parameters
        for p in ["bod", "cod", "tss", "ph"]:
            assert p in data["metrics"]
            mae = data["metrics"][p]["mae"]
            rmse = data["metrics"][p]["rmse"]
            assert mae > 0.0
            assert rmse >= mae
            assert data["metrics"][p]["samples_evaluated"] == 96


def test_scenario_rejected_input_and_facility_isolation_workflow(client: TestClient, test_facility_a: Facility, test_facility_b: Facility):
    """Verify API schema rejection on invalid input and facility boundary isolation enforcement."""
    fac_a_id = str(test_facility_a.facility_id)
    fac_b_id = str(test_facility_b.facility_id)
    operator_a_headers = get_auth_headers("operator", facility_id=test_facility_a.facility_id)

    # 1. Rejected input: duration_minutes below allowed minimum (schema requires ge=15)
    invalid_duration_payload = {
        "scenario_type": "influent_quality_change",
        "duration_minutes": 5,
    }
    resp_422 = client.post(
        f"/api/v1/facilities/{fac_a_id}/twin/scenarios",
        json=invalid_duration_payload,
        headers=operator_a_headers,
    )
    assert resp_422.status_code == 422
    data_422 = resp_422.json()
    assert data_422.get("error_code") == "VALIDATION_ERROR" or "details" in data_422

    # 2. Rejected input: unsupported scenario type raises 400
    invalid_type_payload = {
        "scenario_type": "completely_fictional_scenario_type",
        "duration_minutes": 60,
    }
    resp_400 = client.post(
        f"/api/v1/facilities/{fac_a_id}/twin/scenarios",
        json=invalid_type_payload,
        headers=operator_a_headers,
    )
    assert resp_400.status_code in [400, 422]

    # 3. Facility boundary isolation: Operator assigned to Facility A cannot access Facility B twin
    unauthorized_resp = client.get(
        f"/api/v1/facilities/{fac_b_id}/twin",
        headers=operator_a_headers,
    )
    assert unauthorized_resp.status_code == 403

    # 4. Unauthenticated access: request without token returns 401 Unauthorized
    unauth_resp = client.get(f"/api/v1/facilities/{fac_a_id}/twin")
    assert unauth_resp.status_code == 401
