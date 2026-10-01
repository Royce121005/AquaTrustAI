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

    from app.core.security import get_current_user_claims
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_claims] = lambda: {"sub": "admin", "username": "admin", "role": "admin", "facility_id": "FAC-CPCB-001"}

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
            "observed_at": (now - timedelta(minutes=15 * (5 - i))).isoformat(),
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
            "observed_at": (now - timedelta(minutes=15 * (5 - i))).isoformat(),
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
        "observed_at": now.isoformat(),
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


def test_reading_idempotency_and_deduplication(test_app_and_db):
    """Verify deduplication via Idempotency-Key header and composite natural key."""
    client, session = test_app_and_db
    facility_id = str(uuid.uuid4())
    observed_time = datetime.now(timezone.utc).isoformat()

    payload = {
        "facility_id": facility_id,
        "observed_at": observed_time,
        "treatment_stage": "aeration_basin",
        "parameter": "DO",
        "value": "2.400000",
        "unit": "mg/L",
        "source": "telemetry",
    }

    # 1. Ingest with Idempotency-Key
    res1 = client.post("/api/v1/ingestion/readings", json=payload, headers={"Idempotency-Key": "idem-key-100"})
    assert res1.status_code == 201
    reading_id_1 = res1.json()["reading_id"]

    # 2. Re-ingest with identical Idempotency-Key
    res2 = client.post("/api/v1/ingestion/readings", json=payload, headers={"Idempotency-Key": "idem-key-100"})
    assert res2.status_code in (200, 201)
    reading_id_2 = res2.json()["reading_id"]
    assert reading_id_1 == reading_id_2

    # 3. Ingest with identical compound key (facility, parameter, stage, observed_at) without idempotency key
    res3 = client.post("/api/v1/ingestion/readings", json=payload)
    assert res3.status_code in (200, 201)
    reading_id_3 = res3.json()["reading_id"]
    assert reading_id_1 == reading_id_3

    # Verify only 1 reading exists in DB
    from app.repositories.reading_repository import ReadingRepository
    repo = ReadingRepository(session)
    readings = repo.get_readings(facility_id=uuid.UUID(facility_id))
    assert len(readings) == 1


def test_sensor_integrity_validation(test_app_and_db):
    """Verify sensor integrity check on ingestion."""
    client, session = test_app_and_db
    facility_id_1 = uuid.uuid4()
    facility_id_2 = uuid.uuid4()

    # Create facilities
    from app.models.facility import Facility
    from app.models.sensor import Sensor
    from app.repositories.facility_repository import FacilityRepository
    fac_repo = FacilityRepository(session)

    f1 = Facility(facility_id=facility_id_1, facility_name="Test STP 1", facility_type="municipal_stp", status="active")
    f2 = Facility(facility_id=facility_id_2, facility_name="Test STP 2", facility_type="municipal_stp", status="active")
    fac_repo.create(f1)
    fac_repo.create(f2)

    # Create sensor under facility 1
    sensor_id = uuid.uuid4()
    s1 = Sensor(sensor_id=sensor_id, facility_id=facility_id_1, parameter="DO", unit="mg/L", treatment_stage="aeration_basin", status="active")
    fac_repo.add_sensor(s1)
    session.commit()

    # 1. Ingest with non-existent sensor_id -> 422
    invalid_sensor_payload = {
        "facility_id": str(facility_id_1),
        "sensor_id": str(uuid.uuid4()),
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "treatment_stage": "aeration_basin",
        "parameter": "DO",
        "value": "2.100000",
        "unit": "mg/L",
    }
    bad_res = client.post("/api/v1/ingestion/readings", json=invalid_sensor_payload)
    assert bad_res.status_code == 422
    assert "Sensor not found or not associated with facility" in bad_res.text

    # 2. Ingest with sensor associated to facility 1 under facility 2 -> 422
    cross_fac_payload = {
        "facility_id": str(facility_id_2),
        "sensor_id": str(sensor_id),
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "treatment_stage": "aeration_basin",
        "parameter": "DO",
        "value": "2.100000",
        "unit": "mg/L",
    }
    cross_res = client.post("/api/v1/ingestion/readings", json=cross_fac_payload)
    assert cross_res.status_code == 422

    # 3. Ingest with valid matching sensor_id -> 201
    valid_payload = {
        "facility_id": str(facility_id_1),
        "sensor_id": str(sensor_id),
        "observed_at": datetime.now(timezone.utc).isoformat(),
        "treatment_stage": "aeration_basin",
        "parameter": "DO",
        "value": "2.100000",
        "unit": "mg/L",
    }
    good_res = client.post("/api/v1/ingestion/readings", json=valid_payload)
    assert good_res.status_code == 201


def test_facility_readings_endpoint(test_app_and_db):
    """Verify GET /api/v1/facilities/{facility_id}/readings."""
    client, session = test_app_and_db
    fac_res = client.post(
        "/api/v1/facilities",
        json={
            "facility_name": "Delhi Treatment Plant",
            "facility_type": "municipal_stp",
            "location": {"city": "Delhi"},
            "capacity": 120.0,
            "capacity_unit": "MLD",
        },
    )
    assert fac_res.status_code == 201
    fac_id = fac_res.json()["facility_id"]

    # Ingest 3 readings
    for p in ["BOD", "COD", "TSS"]:
        client.post(
            "/api/v1/ingestion/readings",
            json={
                "facility_id": fac_id,
                "observed_at": datetime.now(timezone.utc).isoformat(),
                "treatment_stage": "final_effluent",
                "parameter": p,
                "value": "15.000000",
                "unit": "mg/L",
            },
        )

    # Query facility readings
    readings_res = client.get(f"/api/v1/facilities/{fac_id}/readings")
    assert readings_res.status_code == 200
    data = readings_res.json()
    assert len(data) == 3

    # Query with filter
    filtered_res = client.get(f"/api/v1/facilities/{fac_id}/readings?parameter=BOD")
    assert filtered_res.status_code == 200
    assert len(filtered_res.json()) == 1
    assert filtered_res.json()[0]["parameter"] == "BOD"

    # Query non-existent facility -> 404
    non_existent = client.get(f"/api/v1/facilities/{uuid.uuid4()}/readings")
    assert non_existent.status_code == 404


def test_reading_repository_helpers(test_app_and_db):
    """Verify get_by_idempotency_or_time_key and get_contemporaneous_readings."""
    _, session = test_app_and_db
    from app.repositories.reading_repository import ReadingRepository
    from app.models.reading import Reading
    from app.models.facility import Facility
    from app.repositories.facility_repository import FacilityRepository

    fac_repo = FacilityRepository(session)
    reading_repo = ReadingRepository(session)

    fac_id = uuid.uuid4()
    fac = Facility(facility_id=fac_id, facility_name="Repo Test Facility", facility_type="municipal_stp", status="active")
    fac_repo.create(fac)

    now = datetime.now(timezone.utc)
    r1 = Reading(
        reading_id=uuid.uuid4(),
        facility_id=fac_id,
        observed_at=now,
        treatment_stage="final_effluent",
        parameter="BOD",
        value=Decimal("18.0"),
        unit="mg/L",
        provenance={"idempotency_key": "custom-key-999"},
        quality_status="valid",
    )
    reading_repo.create_reading(r1)
    session.commit()

    # Test get_by_idempotency_or_time_key with time key
    found_time = reading_repo.get_by_idempotency_or_time_key(
        facility_id=fac_id,
        parameter="BOD",
        treatment_stage="final_effluent",
        observed_at=now,
    )
    assert found_time is not None
    assert found_time.reading_id == r1.reading_id

    # Test get_by_idempotency_or_time_key with idempotency key
    found_key = reading_repo.get_by_idempotency_or_time_key(
        facility_id=fac_id,
        parameter="COD",
        treatment_stage="inlet",
        observed_at=now + timedelta(hours=5),
        idempotency_key="custom-key-999",
    )
    assert found_key is not None
    assert found_key.reading_id == r1.reading_id

    # Test contemporaneous readings
    contemp = reading_repo.get_contemporaneous_readings(
        facility_id=fac_id,
        observed_at=now,
        tolerance_seconds=60,
    )
    assert len(contemp) == 1
    assert contemp[0].reading_id == r1.reading_id


def test_simulator_http_bridge_mode(test_app_and_db):
    """Verify simulator start and status with use_http_bridge."""
    client, _ = test_app_and_db

    # Stop any running simulator
    client.post("/api/v1/simulator/stop")

    # Start with bridge mode
    start_payload = {
        "facility_name": "HTTP Bridge STP",
        "interval_seconds": 1.0,
        "use_http_bridge": True,
        "seed": 200,
    }
    start_res = client.post("/api/v1/simulator/start", json=start_payload)
    assert start_res.status_code == 200
    assert start_res.json()["use_http_bridge"] is True

    status_res = client.get("/api/v1/simulator/status")
    assert status_res.status_code == 200
    assert status_res.json()["use_http_bridge"] is True

    # Stop simulator
    client.post("/api/v1/simulator/stop")


def test_phase_b2_canonical_unit_validation(test_app_and_db):
    """Verify validation flags INVALID_UNIT_FOR_{param} when unit is not canonical."""
    client, session = test_app_and_db
    facility_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Ingest with invalid unit for BOD
    payload = {
        "facility_id": facility_id,
        "observed_at": now.isoformat(),
        "treatment_stage": "final_effluent",
        "parameter": "BOD",
        "value": "20.000000",
        "unit": "gallons_per_minute",
        "source": "telemetry",
    }
    res = client.post("/api/v1/ingestion/readings", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["quality_status"] == "invalid"
    assert data["anomaly_status"] == "insufficient_data"

    val_res = client.get(f"/api/v1/validation/readings/{data['reading_id']}")
    assert val_res.status_code == 200
    assert "INVALID_UNIT_FOR_BOD" in val_res.json()["validation_flags"]


def test_phase_b2_future_and_stale_timestamps(test_app_and_db):
    """Verify FUTURE_TIMESTAMP_ERROR (>5m) and STALE_HISTORICAL_TIMESTAMP (>365d)."""
    client, session = test_app_and_db
    facility_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # 1. Future timestamp (> 5 min ahead) -> INVALID & AI bypassed
    future_payload = {
        "facility_id": facility_id,
        "observed_at": (now + timedelta(minutes=10)).isoformat(),
        "treatment_stage": "final_effluent",
        "parameter": "COD",
        "value": "120.000000",
        "unit": "mg/L",
        "source": "telemetry",
    }
    res_fut = client.post("/api/v1/ingestion/readings", json=future_payload)
    assert res_fut.status_code == 201
    data_fut = res_fut.json()
    assert data_fut["quality_status"] == "invalid"
    assert data_fut["anomaly_status"] == "insufficient_data"

    val_res = client.get(f"/api/v1/validation/readings/{data_fut['reading_id']}")
    assert "FUTURE_TIMESTAMP_ERROR" in val_res.json()["validation_flags"]

    # 2. Stale timestamp (> 365 days ago) -> SUSPECT
    stale_payload = {
        "facility_id": facility_id,
        "observed_at": (now - timedelta(days=400)).isoformat(),
        "treatment_stage": "final_effluent",
        "parameter": "COD",
        "value": "120.000000",
        "unit": "mg/L",
        "source": "telemetry",
    }
    res_stale = client.post("/api/v1/ingestion/readings", json=stale_payload)
    assert res_stale.status_code == 201
    data_stale = res_stale.json()
    assert data_stale["quality_status"] == "suspect"

    val_stale = client.get(f"/api/v1/validation/readings/{data_stale['reading_id']}")
    assert "STALE_HISTORICAL_TIMESTAMP" in val_stale.json()["validation_flags"]


def test_phase_b2_duplicate_observation_detection(test_app_and_db):
    """Verify DUPLICATE_OBSERVATION flag on identical readings."""
    _, session = test_app_and_db
    from app.models.reading import Reading
    from app.services.validation_service import ValidationService

    facility_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    r1 = Reading(
        reading_id=uuid.uuid4(),
        facility_id=facility_id,
        observed_at=now,
        treatment_stage="final_effluent",
        parameter="BOD",
        value=Decimal("25.0"),
        unit="mg/L",
        quality_status="pending",
    )
    session.add(r1)
    session.commit()

    val_res1 = ValidationService.validate_reading(session, r1)
    assert val_res1.quality_status == "valid"
    assert "DUPLICATE_OBSERVATION" not in val_res1.validation_flags

    # Second reading with same facility, parameter, stage, timestamp
    r2 = Reading(
        reading_id=uuid.uuid4(),
        facility_id=facility_id,
        observed_at=now,
        treatment_stage="final_effluent",
        parameter="BOD",
        value=Decimal("25.0"),
        unit="mg/L",
        quality_status="pending",
    )

    val_res2 = ValidationService.validate_reading(session, r2)
    assert val_res2.quality_status == "invalid"
    assert "DUPLICATE_OBSERVATION" in val_res2.validation_flags



def test_phase_b2_stoichiometric_cross_param_consistency(test_app_and_db):
    """Verify stoichiometric validation: COD < BOD and nitrogen imbalance."""
    _, session = test_app_and_db
    from app.models.reading import Reading
    from app.services.validation_service import ValidationService

    facility_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    # 1. COD < BOD test: Ingest BOD = 100 mg/L, then contemporaneous COD = 50 mg/L
    bod_reading = Reading(
        reading_id=uuid.uuid4(),
        facility_id=facility_id,
        observed_at=now,
        treatment_stage="final_effluent",
        parameter="BOD",
        value=Decimal("100.0"),
        unit="mg/L",
        quality_status="valid",
    )
    session.add(bod_reading)
    session.commit()

    cod_reading = Reading(
        reading_id=uuid.uuid4(),
        facility_id=facility_id,
        observed_at=now + timedelta(minutes=2),
        treatment_stage="final_effluent",
        parameter="COD",
        value=Decimal("50.0"),
        unit="mg/L",
        quality_status="pending",
    )
    session.add(cod_reading)
    session.commit()

    val_cod = ValidationService.validate_reading(session, cod_reading)
    assert val_cod.quality_status == "invalid"
    assert "CROSS_PARAM_COD_LESS_THAN_BOD" in val_cod.validation_flags

    # 2. Nitrogen imbalance: Ingest TN = 10 mg/L and contemporaneous NH4_N = 20 mg/L (NH4_N > TN)
    tn_reading = Reading(
        reading_id=uuid.uuid4(),
        facility_id=facility_id,
        observed_at=now + timedelta(hours=1),
        treatment_stage="final_effluent",
        parameter="TN",
        value=Decimal("10.0"),
        unit="mg/L",
        quality_status="valid",
    )
    session.add(tn_reading)
    session.commit()

    nh4_reading = Reading(
        reading_id=uuid.uuid4(),
        facility_id=facility_id,
        observed_at=now + timedelta(hours=1, minutes=3),
        treatment_stage="final_effluent",
        parameter="NH4_N",
        value=Decimal("20.0"),
        unit="mg/L",
        quality_status="pending",
    )
    session.add(nh4_reading)
    session.commit()

    val_nh4 = ValidationService.validate_reading(session, nh4_reading)
    assert val_nh4.quality_status == "invalid"
    assert "CROSS_PARAM_NITROGEN_IMBALANCE" in val_nh4.validation_flags


def test_phase_b2_ai_boundary_hardening_gating(test_app_and_db):
    """Verify AnomalyService completely bypasses engine.predict for invalid or insufficient_data readings."""
    _, session = test_app_and_db
    from app.models.reading import Reading
    from app.services.anomaly_service import AnomalyService

    facility_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    # Invalid reading
    invalid_reading = Reading(
        reading_id=uuid.uuid4(),
        facility_id=facility_id,
        observed_at=now,
        treatment_stage="final_effluent",
        parameter="BOD",
        value=Decimal("9999.0"),  # Out of bounds
        unit="mg/L",
        quality_status="invalid",
    )
    session.add(invalid_reading)
    session.commit()

    res = AnomalyService.infer_reading(session, invalid_reading)
    assert res.anomaly_status == "insufficient_data"
    assert res.anomaly_score is None
    assert res.model_metadata.get("skipped") is True
    assert "bypassed_due_to_quality_status_invalid" in res.model_metadata.get("reason", "")

    # Insufficient data reading (null value)
    null_reading = Reading(
        reading_id=uuid.uuid4(),
        facility_id=facility_id,
        observed_at=now,
        treatment_stage="final_effluent",
        parameter="COD",
        value=None,
        unit="mg/L",
        quality_status="insufficient_data",
    )
    session.add(null_reading)
    session.commit()

    res_null = AnomalyService.infer_reading(session, null_reading)
    assert res_null.anomaly_status == "insufficient_data"
    assert res_null.anomaly_score is None
    assert res_null.model_metadata.get("skipped") is True
    assert "bypassed_due_to_quality_status_insufficient_data" in res_null.model_metadata.get("reason", "")


def test_retroactive_stoichiometric_invalidation(test_app_and_db):
    """Verify that when a conflicting reading arrives later (COD < BOD), the earlier reading is also retroactively flagged invalid."""
    _, session = test_app_and_db
    from app.models.reading import Reading
    from app.services.validation_service import ValidationService
    from app.repositories.reading_repository import ReadingRepository

    facility_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    reading_repo = ReadingRepository(session)

    # 1. First reading: BOD = 100 mg/L arrives first (no COD present yet -> valid)
    r_bod = Reading(
        reading_id=uuid.uuid4(),
        facility_id=facility_id,
        observed_at=now,
        treatment_stage="final_effluent",
        parameter="BOD",
        value=Decimal("100.0"),
        unit="mg/L",
        quality_status="pending",
    )
    session.add(r_bod)
    session.commit()
    ValidationService.validate_reading(session, r_bod)
    assert r_bod.quality_status == "valid"

    # 2. Second reading: COD = 40 mg/L arrives later (COD < BOD -> invalid)
    r_cod = Reading(
        reading_id=uuid.uuid4(),
        facility_id=facility_id,
        observed_at=now + timedelta(minutes=1),
        treatment_stage="final_effluent",
        parameter="COD",
        value=Decimal("40.0"),
        unit="mg/L",
        quality_status="pending",
    )
    session.add(r_cod)
    session.commit()
    ValidationService.validate_reading(session, r_cod)
    assert r_cod.quality_status == "invalid"

    # 3. Assert that earlier BOD reading was retroactively marked invalid
    session.refresh(r_bod)
    assert r_bod.quality_status == "invalid"
    bod_val_res = reading_repo.get_validation_result(r_bod.reading_id)
    assert "CROSS_PARAM_COD_LESS_THAN_BOD" in bod_val_res.validation_flags

