"""AquaTrust AI — Checkpoint 2 Automated Test Suite.

Tests Telemetry Ingestion, Deterministic Validation, AI Anomaly Inference,
Sliding-Window DB Hydration, Facilities APIs, and Simulator Control Bridge.
"""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import create_application
from app.models import Facility, Reading, ValidationResult, AnomalyResult


@pytest.fixture(scope="function")
def test_app_and_db():
    """Create isolated SQLite database and test client with dependency override."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()

    app = create_application()

    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield client, session

    session.close()
    Base.metadata.drop_all(bind=engine)


def test_facility_registration_and_retrieval(test_app_and_db):
    """Verify POST /api/v1/facilities and GET /api/v1/facilities."""
    client, session = test_app_and_db
    facility_data = {
        "facility_name": "Bharwara STP Lucknow",
        "facility_type": "municipal_stp",
        "location": {"city": "Lucknow", "state": "UP"},
        "capacity": 345.0,
        "capacity_unit": "MLD",
        "status": "active",
    }
    res = client.post("/api/v1/facilities", json=facility_data)
    assert res.status_code == 201
    created = res.json()
    assert created["facility_name"] == "Bharwara STP Lucknow"
    facility_id = created["facility_id"]

    # Retrieve
    get_res = client.get(f"/api/v1/facilities/{facility_id}")
    assert get_res.status_code == 200
    assert get_res.json()["facility_id"] == facility_id

    # List
    list_res = client.get("/api/v1/facilities")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1


def test_single_reading_ingestion_pipeline(test_app_and_db):
    """Verify single observation ingestion triggers validation and AI inference."""
    client, session = test_app_and_db
    facility_id = str(uuid.uuid4())

    payload = {
        "facility_id": facility_id,
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "treatment_stage": "final_effluent",
        "parameter": "BOD",
        "value": "22.500000",
        "unit": "mg/L",
        "source": "telemetry",
    }

    res = client.post("/api/v1/ingestion/readings", json=payload, headers={"Idempotency-Key": "test-key-01"})
    assert res.status_code == 201
    data = res.json()
    assert data["parameter"] == "BOD"
    assert data["quality_status"] == "valid"
    assert "anomaly_status" in data
    assert data["reading_id"] is not None

    # Check reading query
    reading_id = data["reading_id"]
    get_res = client.get(f"/api/v1/readings/{reading_id}")
    assert get_res.status_code == 200
    assert float(get_res.json()["value"]) == 22.5


def test_deterministic_validation_out_of_bounds(test_app_and_db):
    """Verify out-of-bounds physical measurement is flagged as INVALID."""
    client, session = test_app_and_db
    facility_id = str(uuid.uuid4())

    # Invalid pH > 14
    payload = {
        "facility_id": facility_id,
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "treatment_stage": "final_effluent",
        "parameter": "PH",
        "value": "18.500000",
        "unit": "pH units",
        "source": "telemetry",
    }
    res = client.post("/api/v1/ingestion/readings", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["quality_status"] == "invalid"

    # Query validation endpoint
    val_res = client.get(f"/api/v1/validation/readings/{data['reading_id']}")
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["quality_status"] == "invalid"
    assert "OUT_OF_BOUNDS_ABOVE_MAX_PH" in val_data["validation_flags"]


def test_batch_ingestion_and_query_filters(test_app_and_db):
    """Verify batch ingestion and filtered querying."""
    client, session = test_app_and_db
    facility_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    readings = []
    for i in range(5):
        readings.append({
            "facility_id": facility_id,
            "observed_at": (now + timedelta(minutes=15 * i)).isoformat(),
            "treatment_stage": "final_effluent",
            "parameter": "COD",
            "value": f"{150.0 + i * 10:.6f}",
            "unit": "mg/L",
            "source": "telemetry",
        })

    batch_payload = {
        "facility_id": facility_id,
        "batch_id": str(uuid.uuid4()),
        "readings": readings,
    }

    res = client.post("/api/v1/ingestion/batch", json=batch_payload)
    assert res.status_code == 201
    batch_res = res.json()
    assert batch_res["total_received"] == 5
    assert batch_res["total_ingested"] == 5
    assert len(batch_res["reading_ids"]) == 5

    # Filtered query
    q_res = client.get(f"/api/v1/readings?facility_id={facility_id}&parameter=COD")
    assert q_res.status_code == 200
    assert len(q_res.json()) == 5


def test_ai_anomaly_inference_and_stream_hydration(test_app_and_db):
    """Verify AI inference evaluates stream context and detects anomalous observations."""
    client, session = test_app_and_db
    facility_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Ingest 5 normal readings to warm the sliding window context
    for i in range(5):
        payload = {
            "facility_id": facility_id,
            "observed_at": (now + timedelta(minutes=15 * i)).isoformat(),
            "treatment_stage": "final_effluent",
            "parameter": "BOD",
            "value": "20.000000",
            "unit": "mg/L",
            "source": "telemetry",
        }
        client.post("/api/v1/ingestion/readings", json=payload)

    # Ingest extreme spike reading
    spike_payload = {
        "facility_id": facility_id,
        "observed_at": (now + timedelta(minutes=15 * 6)).isoformat(),
        "treatment_stage": "final_effluent",
        "parameter": "BOD",
        "value": "950.000000",
        "unit": "mg/L",
        "source": "telemetry",
    }
    spike_res = client.post("/api/v1/ingestion/readings", json=spike_payload)
    assert spike_res.status_code == 201
    data = spike_res.json()
    assert data["anomaly_status"] == "anomalous"
    assert data["anomaly_score"] is not None

    # Anomaly report endpoint
    rep_res = client.get(f"/api/v1/anomalies/readings/{data['reading_id']}")
    assert rep_res.status_code == 200
    rep = rep_res.json()
    assert rep["is_anomalous"] is True
    assert rep["anomaly_status"] == "anomalous"


def test_anomaly_metrics_endpoint(test_app_and_db):
    """Verify GET /api/v1/anomalies/metrics summary for insights dashboard."""
    client, session = test_app_and_db
    res = client.get("/api/v1/anomalies/metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert "total_inferences" in metrics
    assert "anomalies_detected" in metrics
    assert "anomaly_rate_percent" in metrics
    assert "model_version" in metrics


def test_simulator_control_bridge(test_app_and_db):
    """Verify simulator start, status, anomaly injection, and stop lifecycle."""
    client, session = test_app_and_db

    # Status before start
    status_res = client.get("/api/v1/simulator/status")
    assert status_res.status_code == 200
    assert status_res.json()["is_running"] is False

    # Start
    start_payload = {
        "facility_name": "Test Simulation STP",
        "interval_seconds": 1.0,
        "seed": 100,
    }
    start_res = client.post("/api/v1/simulator/start", json=start_payload)
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "started"

    # Status after start
    status_res2 = client.get("/api/v1/simulator/status")
    assert status_res2.status_code == 200
    assert status_res2.json()["is_running"] is True

    # Inject anomaly
    inject_payload = {
        "scenario_id": "organic_shock",
        "severity": 2.5,
        "duration_steps": 5,
    }
    inject_res = client.post("/api/v1/simulator/inject-anomaly", json=inject_payload)
    assert inject_res.status_code == 200
    assert inject_res.json()["status"] == "injected"

    # Stop
    stop_res = client.post("/api/v1/simulator/stop")
    assert stop_res.status_code == 200
    assert stop_res.json()["status"] == "stopped"
