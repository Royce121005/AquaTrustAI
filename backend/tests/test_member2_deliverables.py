"""AquaTrust AI — Member 2 Deliverables Full Test Suite.

Validates all 6 Member 2 phases:
- Phase 2: Sensor Health, Calibration intervals & Drift Detection APIs
- Phase 3: Quality Prediction Persistence, Downstream Forecasting & APIs
- Phase 4: Process Recommendations Persistence, Setpoints & Operator Actions
- Phase 5: Sustainability & Resource Optimization Intelligence APIs
- Phases 6 & 7: Expanded Integrated Treatment Record Evidence Snapshot & DLT Hash
- Phase 9: Centralized Lifecycle Audit Timeline & Event Aggregation
"""

import pytest
from datetime import datetime, timezone, timedelta
from uuid import uuid4, UUID
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    Facility,
    Sensor,
    Reading,
    TreatmentRecord,
    Prediction,
    Recommendation,
    AuditLog,
)
from app.services.treatment_service import TreatmentService
from app.dlt.canonicalizer import canonicalize_treatment_record


@pytest.fixture
def test_facility(db_session: Session) -> Facility:
    fac = Facility(
        facility_id=uuid4(),
        facility_name="Okhla Phase-IV STP New Delhi",
        facility_type="municipal_stp",
        location={"city": "New Delhi", "state": "Delhi", "country": "India"},
        capacity=Decimal("30.0"),
        capacity_unit="MLD",
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    db_session.add(fac)
    db_session.commit()
    return fac


@pytest.fixture
def test_sensors(db_session: Session, test_facility: Facility) -> list[Sensor]:
    now = datetime.now(timezone.utc)
    s_bod = Sensor(
        sensor_id=uuid4(),
        facility_id=test_facility.facility_id,
        parameter="BOD",
        unit="mg/L",
        treatment_stage="final_effluent",
        status="active",
        last_calibrated_at=now - timedelta(days=10),
        calibration_status="calibrated",
        drift_flag=False,
    )
    s_cod = Sensor(
        sensor_id=uuid4(),
        facility_id=test_facility.facility_id,
        parameter="COD",
        unit="mg/L",
        treatment_stage="final_effluent",
        status="active",
        last_calibrated_at=now - timedelta(days=65),  # Overdue (>60 days)
        calibration_status="overdue",
        drift_flag=False,
    )
    s_tss = Sensor(
        sensor_id=uuid4(),
        facility_id=test_facility.facility_id,
        parameter="TSS",
        unit="mg/L",
        treatment_stage="final_effluent",
        status="active",
        last_calibrated_at=now - timedelta(days=5),
        calibration_status="calibrated",
        drift_flag=False,
    )
    db_session.add_all([s_bod, s_cod, s_tss])
    db_session.commit()
    return [s_bod, s_cod, s_tss]


# ---------------------------------------------------------------------------
# Phase 2: Sensor Health & Calibration Tests
# ---------------------------------------------------------------------------

def test_sensor_health_evaluation(sync_client: TestClient, operator_token: str, test_facility: Facility, test_sensors: list[Sensor]):
    headers = {"Authorization": f"Bearer {operator_token}"}
    resp = sync_client.get(f"/api/v1/sensors/health?facility_id={test_facility.facility_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["facility_id"] == str(test_facility.facility_id)
    assert data["total_sensors"] == 3
    assert data["overdue_calibration_sensors"] >= 1  # s_cod is overdue
    assert 0.0 <= data["overall_health_index"] <= 100.0

    sensors_out = {s["parameter"]: s for s in data["sensors"]}
    assert sensors_out["BOD"]["calibration_status"] == "calibrated"
    assert sensors_out["COD"]["calibration_status"] == "overdue"
    assert sensors_out["COD"]["is_calibration_due"] is True


def test_sensor_drift_detection(sync_client: TestClient, db_session: Session, operator_token: str, test_facility: Facility, test_sensors: list[Sensor]):
    s_bod = test_sensors[0]
    now = datetime.now(timezone.utc)

    # Insert progressive linear drift readings: 10.0, 15.0, 20.0, 25.0, 30.0 mg/L
    for i, val in enumerate([10.0, 15.0, 20.0, 25.0, 30.0]):
        r = Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            sensor_id=s_bod.sensor_id,
            parameter="BOD",
            value=Decimal(str(val)),
            unit="mg/L",
            treatment_stage="final_effluent",
            observed_at=now - timedelta(minutes=(5 - i) * 15),
            quality_status="valid",
        )
        db_session.add(r)
    db_session.commit()

    headers = {"Authorization": f"Bearer {operator_token}"}
    resp = sync_client.get(f"/api/v1/sensors/health?facility_id={test_facility.facility_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    bod_item = next(s for s in data["sensors"] if s["parameter"] == "BOD")
    assert bod_item["drift_flag"] is True
    assert bod_item["health_score"] < 80.0  # Drift penalized


def test_sensor_calibration_reset_and_audit(sync_client: TestClient, db_session: Session, operator_token: str, test_facility: Facility, test_sensors: list[Sensor]):
    s_cod = test_sensors[1]
    s_cod.drift_flag = True
    db_session.commit()

    headers = {"Authorization": f"Bearer {operator_token}"}
    payload = {
        "sensor_id": str(s_cod.sensor_id),
        "calibration_type": "optical_do_two_point",
        "notes": "Span calibrated against standard 1000 mg/L KHP reference solution.",
    }
    resp = sync_client.post("/api/v1/sensors/calibration", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["sensor_id"] == str(s_cod.sensor_id)
    assert data["calibration_status"] == "calibrated"
    assert data["drift_flag"] is False

    # Verify database state
    db_session.refresh(s_cod)
    assert s_cod.calibration_status == "calibrated"
    assert s_cod.drift_flag is False

    # Verify centralized audit log was created
    audit = db_session.query(AuditLog).filter(
        AuditLog.action == "SENSOR_CALIBRATED",
        AuditLog.resource_id == s_cod.sensor_id,
    ).first()
    assert audit is not None
    assert audit.audit_metadata["parameter"] == "COD"


# ---------------------------------------------------------------------------
# Phase 3: Quality Prediction Persistence & APIs Tests
# ---------------------------------------------------------------------------

def test_prediction_evaluate_explicit(sync_client: TestClient, operator_token: str, test_facility: Facility):
    headers = {"Authorization": f"Bearer {operator_token}"}
    payload = {
        "facility_id": str(test_facility.facility_id),
        "inlet_bod": 240.0,
        "inlet_cod": 500.0,
        "inlet_tss": 280.0,
        "inlet_ph": 7.3,
        "flow_rate_q": 30000.0,
        "lead_time_hours": 6.0,
    }
    resp = sync_client.post("/api/v1/predictions/evaluate", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["facility_id"] == str(test_facility.facility_id)
    assert data["horizon_hours"] == 6.0
    assert "bod" in data["predicted_parameters"]
    assert "cod" in data["predicted_parameters"]
    assert "tss" in data["predicted_parameters"]
    assert data["predicted_parameters"]["bod"]["cpcb_discharge_limit"] == 30.0
    assert data["overall_risk_status"] in ("LOW_RISK", "MODERATE_RISK", "HIGH_RISK")
    assert 0.0 <= data["overall_risk_score"] <= 1.0


def test_prediction_evaluate_dual_mode_auto_telemetry(sync_client: TestClient, db_session: Session, operator_token: str, test_facility: Facility, test_sensors: list[Sensor]):
    now = datetime.now(timezone.utc)
    # Insert recent inlet readings
    for param, val in [("BOD", 210.0), ("COD", 440.0), ("TSS", 220.0), ("PH", 7.5)]:
        r = Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            parameter=param,
            value=Decimal(str(val)),
            unit="mg/L" if param != "PH" else "pH units",
            treatment_stage="inlet",
            observed_at=now - timedelta(minutes=10),
            quality_status="valid",
        )
        db_session.add(r)
    db_session.commit()

    headers = {"Authorization": f"Bearer {operator_token}"}
    # Omit influent parameters; backend must auto-resolve from readings
    resp = sync_client.post(
        "/api/v1/predictions/evaluate",
        json={"facility_id": str(test_facility.facility_id)},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["facility_id"] == str(test_facility.facility_id)
    assert "bod" in data["predicted_parameters"]


def test_prediction_get_latest(sync_client: TestClient, operator_token: str, test_facility: Facility):
    headers = {"Authorization": f"Bearer {operator_token}"}
    resp = sync_client.get(f"/api/v1/predictions/latest?facility_id={test_facility.facility_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["facility_id"] == str(test_facility.facility_id)
    assert data["has_prediction"] is True
    assert data["latest_prediction"] is not None


# ---------------------------------------------------------------------------
# Phase 4: Process Recommendations Engine & APIs Tests
# ---------------------------------------------------------------------------

def test_recommendations_active_and_apply(sync_client: TestClient, db_session: Session, operator_token: str, test_facility: Facility):
    headers = {"Authorization": f"Bearer {operator_token}"}
    resp = sync_client.get(f"/api/v1/recommendations/active?facility_id={test_facility.facility_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["facility_id"] == str(test_facility.facility_id)
    assert data["total_count"] >= 1
    recs = data["recommendations"]
    assert len(recs) >= 1

    first_rec = recs[0]
    assert first_rec["status"] == "active"
    assert first_rec["category"] in ("AERATION", "CHEMICAL_DOSING", "HYDRAULIC_CONTROL", "SLUDGE_MANAGEMENT", "MAINTENANCE", "RESOURCE_SAVING")

    # Apply recommendation
    rec_id = first_rec["recommendation_id"]
    apply_payload = {
        "setpoint_applied": 34.0,
        "operator_notes": "Blower VFD setpoint manually reduced as recommended.",
    }
    apply_resp = sync_client.post(f"/api/v1/recommendations/{rec_id}/apply", json=apply_payload, headers=headers)
    assert apply_resp.status_code == 200
    apply_data = apply_resp.json()
    assert apply_data["status"] == "applied"
    assert apply_data["applied_at"] is not None

    # Verify audit log
    audit = db_session.query(AuditLog).filter(
        AuditLog.action == "RECOMMENDATION_APPLIED",
        AuditLog.resource_id == UUID(rec_id),
    ).first()
    assert audit is not None


def test_recommendation_history(sync_client: TestClient, operator_token: str, test_facility: Facility):
    headers = {"Authorization": f"Bearer {operator_token}"}
    # Populate initial active recommendations first
    sync_client.get(f"/api/v1/recommendations/active?facility_id={test_facility.facility_id}", headers=headers)

    resp = sync_client.get(f"/api/v1/recommendations/history?facility_id={test_facility.facility_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["facility_id"] == str(test_facility.facility_id)
    assert data["total_count"] >= 1


# ---------------------------------------------------------------------------
# Phase 5: Sustainability & Resource Optimization APIs Tests
# ---------------------------------------------------------------------------

def test_sustainability_summary_and_facility_optimization(sync_client: TestClient, operator_token: str, test_facility: Facility):
    headers = {"Authorization": f"Bearer {operator_token}"}

    # Summary
    resp_sum = sync_client.get("/api/v1/sustainability/summary", headers=headers)
    assert resp_sum.status_code == 200
    sum_data = resp_sum.json()
    assert sum_data["water_treated_kl_day"] >= 0.0
    assert sum_data["freshwater_saved_kl_day"] >= 0.0
    assert 0.0 <= sum_data["water_circularity_ratio_pct"] <= 100.0
    assert "AquaTrust" in sum_data["esg_verifiable_claim"]

    # Facility optimization
    resp_opt = sync_client.get(f"/api/v1/facilities/{test_facility.facility_id}/optimization", headers=headers)
    assert resp_opt.status_code == 200
    opt_data = resp_opt.json()
    assert opt_data["facility_id"] == str(test_facility.facility_id)
    assert opt_data["aeration_optimization"]["optimal_do_setpoint_mg_l"] > 0.0
    assert opt_data["chemical_optimization"]["optimal_dosing_mg_l"] > 0.0
    assert opt_data["total_daily_savings_inr"] >= 0.0


# ---------------------------------------------------------------------------
# Phases 6 & 7: Expanded Integrated Treatment Record Evidence Snapshot Tests
# ---------------------------------------------------------------------------

def test_treatment_record_expanded_evidence_snapshot(db_session: Session, test_facility: Facility, test_sensors: list[Sensor]):
    now = datetime.now(timezone.utc)

    # Insert compliant observations
    for s in test_sensors:
        val = 15.0 if s.parameter == "BOD" else (60.0 if s.parameter == "COD" else 20.0)
        r = Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            sensor_id=s.sensor_id,
            parameter=s.parameter,
            value=Decimal(str(val)),
            unit=s.unit,
            treatment_stage="final_effluent",
            observed_at=now - timedelta(hours=1),
            quality_status="valid",
        )
        db_session.add(r)

    # Create treatment record eligible for finalization
    record = TreatmentRecord(
        record_id=uuid4(),
        facility_id=test_facility.facility_id,
        period_start=now - timedelta(hours=2),
        period_end=now,
        quality_status="valid",
        anomaly_status="normal",
        compliance_status="compliant",
        record_state="eligible_for_finalization",
        provenance={"system": "AquaTrust Automated Supervisory Engine"},
        created_at=now,
    )
    db_session.add(record)
    db_session.commit()

    # Finalize record
    finalized = TreatmentService.finalize_record(
        db=db_session,
        record=record,
        actor_id=uuid4(),
        actor_role="operator",
    )

    assert finalized.record_state == "finalized"
    assert finalized.canonical_hash is not None
    assert finalized.signature_id is not None

    # Verify expanded evidence snapshot incorporates cycle intelligence
    snapshot = finalized.evidence_snapshot
    assert "cycle_intelligence" in snapshot
    cycle_intel = snapshot["cycle_intelligence"]
    assert "sustainability_summary" in cycle_intel
    assert "freshwater_saved_kl" in cycle_intel["sustainability_summary"]

    # Verify deterministic canonicalization format
    test_dict = {
        "record_id": str(finalized.record_id),
        "facility_id": str(finalized.facility_id),
        "period_start": finalized.period_start.isoformat(),
        "period_end": finalized.period_end.isoformat(),
        "record_version": finalized.record_version,
        "quality_status": finalized.quality_status,
        "anomaly_status": finalized.anomaly_status,
        "compliance_status": finalized.compliance_status,
        "compliance_summary": {},
        "cycle_intelligence": cycle_intel,
        "provenance": finalized.provenance or {},
    }
    canon_bytes = canonicalize_treatment_record(test_dict)
    assert b"cycle_intelligence" in canon_bytes
    assert b"atc-v1" in canon_bytes


# ---------------------------------------------------------------------------
# Phase 9: Centralized Lifecycle Audit Timeline Tests
# ---------------------------------------------------------------------------

def test_centralized_audit_timeline(sync_client: TestClient, auditor_token: str, test_facility: Facility):
    headers = {"Authorization": f"Bearer {auditor_token}"}
    resp = sync_client.get(f"/api/v1/audit/timeline?facility_id={test_facility.facility_id}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["facility_id"] == str(test_facility.facility_id)
    assert "timeline" in data
    assert isinstance(data["timeline"], list)

    # Test category filter
    resp_pred = sync_client.get(f"/api/v1/audit/timeline?category=PREDICTION", headers=headers)
    assert resp_pred.status_code == 200
    pred_timeline = resp_pred.json()["timeline"]
    for item in pred_timeline:
        assert item["category"] == "PREDICTION"
