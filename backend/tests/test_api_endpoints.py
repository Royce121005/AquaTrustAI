"""AquaTrust AI — Full API Endpoints Integration Test Suite.

Exhaustively verifies every route registered in the API v1 router.
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import get_db, engine
from app.models import Base
from app.models.facility import Facility
from app.models.sensor import Sensor
from app.models.reading import Reading
from app.services.treatment_service import TreatmentService
from app.core.security import get_current_user_claims


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
    app.dependency_overrides[get_current_user_claims] = lambda: {"sub": "test_operator", "role": "admin", "facility_id": "FAC-CPCB-001"}
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_all_v1_api_routes(client: TestClient, db_session: Session):
    """Smoke test across all primary API v1 endpoints."""
    # 1. Health
    h_resp = client.get("/api/v1/health")
    assert h_resp.status_code == 200
    assert h_resp.json()["status"] in ["healthy", "ok"]

    # 2. Facilities
    fac_resp = client.post(
        "/api/v1/facilities",
        json={
            "facility_name": "Yamuna River STP Unit 1",
            "facility_type": "municipal_stp",
            "location": {"city": "New Delhi", "river_basin": "Yamuna"},
            "capacity": 75.0,
            "capacity_unit": "MLD",
        },
    )
    assert fac_resp.status_code == 201
    fac_id = fac_resp.json()["facility_id"]

    list_fac = client.get("/api/v1/facilities")
    assert list_fac.status_code == 200
    assert len(list_fac.json()) >= 1

    # 3. Ingestion Single & Batch
    ing_resp = client.post(
        "/api/v1/telemetry/ingest",
        json={
            "facility_id": fac_id,
            "treatment_stage": "final_effluent",
            "parameter": "BOD",
            "value": 15.5,
            "unit": "mg/L",
            "observed_at": datetime.now(timezone.utc).isoformat(),
        },
    )
    assert ing_resp.status_code == 201

    batch_resp = client.post(
        "/api/v1/telemetry/ingest/batch",
        json={
            "facility_id": fac_id,
            "readings": [
                {
                    "facility_id": fac_id,
                    "treatment_stage": "final_effluent",
                    "parameter": "COD",
                    "value": 110.0,
                    "unit": "mg/L",
                    "observed_at": datetime.now(timezone.utc).isoformat(),
                },
                {
                    "facility_id": fac_id,
                    "treatment_stage": "final_effluent",
                    "parameter": "TSS",
                    "value": 25.0,
                    "unit": "mg/L",
                    "observed_at": datetime.now(timezone.utc).isoformat(),
                },
                {
                    "facility_id": fac_id,
                    "treatment_stage": "final_effluent",
                    "parameter": "PH",
                    "value": 7.3,
                    "unit": "pH units",
                    "observed_at": datetime.now(timezone.utc).isoformat(),
                },
                {
                    "facility_id": fac_id,
                    "treatment_stage": "final_effluent",
                    "parameter": "NH4_N",
                    "value": 8.0,
                    "unit": "mg/L",
                    "observed_at": datetime.now(timezone.utc).isoformat(),
                },
            ],
        },
    )
    assert batch_resp.status_code == 201

    # 4. Ingestion Query
    readings_resp = client.get(f"/api/v1/telemetry/readings?facility_id={fac_id}")
    assert readings_resp.status_code == 200
    assert len(readings_resp.json()) == 5

    # 5. Pre-AI Validation Stats
    val_stats = client.get(f"/api/v1/validation/stats?facility_id={fac_id}")
    assert val_stats.status_code == 200

    # 6. AI Anomaly Metrics
    anom_metrics = client.get(f"/api/v1/anomalies/metrics?facility_id={fac_id}")
    assert anom_metrics.status_code == 200

    # 7. Simulator Control
    sim_status = client.get("/api/v1/simulator/status")
    assert sim_status.status_code == 200

    # 8. Compliance Rules
    rules = client.get("/api/v1/compliance/rules")
    assert rules.status_code == 200
    assert len(rules.json()) >= 5

    # 9. Finalize Treatment Record
    now = datetime.now(timezone.utc)
    fin_resp = client.post(
        "/api/v1/treatment-records/finalize",
        json={
            "facility_id": fac_id,
            "period_start": (now - timedelta(hours=1)).isoformat(),
            "period_end": now.isoformat(),
            "key_id": "key-ecdsa-p256-01",
        },
    )
    assert fin_resp.status_code == 201
    rec_id = fin_resp.json()["record_id"]

    # 10. Digital Certificate
    cert_resp = client.get(f"/api/v1/certificates/record/{rec_id}")
    assert cert_resp.status_code == 200

    # 11. Verification
    ver_resp = client.post(f"/api/v1/verification/verify-record/{rec_id}")
    assert ver_resp.status_code == 200

    # 12. DLT Anchors
    dlt_list = client.get("/api/v1/dlt/anchors")
    assert dlt_list.status_code == 200

    # 13. Audit Events
    audit_list = client.get("/api/v1/audit-events")
    assert audit_list.status_code == 200
