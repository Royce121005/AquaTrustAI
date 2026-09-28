"""AquaTrust AI — Checkpoint 3 Test Suite.

Tests for:
- M2-11: Compliance Evaluation Engine (CPCB Schedule VI / 2021 Rules)
- M2-12: Composite Window Aggregator (6h / 24h Windows)
- M2-13: Treatment Finalization Service (Atomic State Transition, Evidence Hash, Signatures)
- M2-14: Certificate Generation Service (Cryptographic Proof Packaging)
- M2-15: Finalization & Certificate API Endpoints
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from uuid import uuid4, UUID
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import get_db, engine
from app.models import Base
from app.models.facility import Facility
from app.models.sensor import Sensor
from app.models.reading import Reading
from app.models.validation_result import ValidationResult
from app.models.anomaly_result import AnomalyResult
from app.models.compliance_rule import ComplianceRule
from app.models.compliance_result import ComplianceResult
from app.models.treatment_record import TreatmentRecord
from app.models.certificate import Certificate
from app.models.signing_key import SigningKey
from app.models.dlt_anchor import DLTAnchor
from app.models.audit_log import AuditLog
from app.services.compliance_service import ComplianceService
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
def test_facility(db_session: Session):
    fac_id = uuid4()
    fac = Facility(
        facility_id=fac_id,
        facility_name="CPCB Central STP Unit",
        facility_type="municipal_stp",
        location={"city": "New Delhi", "state": "Delhi", "country": "India"},
        capacity=Decimal("50.0"),
        capacity_unit="MLD",
        status="active",
    )
    sensor = Sensor(
        sensor_id=uuid4(),
        facility_id=fac_id,
        parameter="BOD",
        unit="mg/L",
        treatment_stage="final_effluent",
        status="active",
    )
    db_session.add(fac)
    db_session.add(sensor)
    db_session.commit()
    return fac


@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_claims] = lambda: {"sub": "test_operator", "role": "operator", "facility_id": "FAC-CPCB-001"}
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_seed_default_cpcb_rules(db_session: Session):
    """Verify default CPCB rules are correctly seeded."""
    rules = ComplianceService.ensure_default_rules(db_session)
    assert len(rules) >= 5

    rule_map = {r.parameter: r for r in rules}
    assert "BOD" in rule_map
    assert rule_map["BOD"].threshold == Decimal("30.000000")
    assert "COD" in rule_map
    assert rule_map["COD"].threshold == Decimal("250.000000")
    assert "TSS" in rule_map
    assert rule_map["TSS"].threshold == Decimal("50.000000")
    assert "PH" in rule_map
    assert rule_map["PH"].threshold_min == Decimal("5.500000")
    assert rule_map["PH"].threshold_max == Decimal("9.000000")
    assert "NH4_N" in rule_map
    assert rule_map["NH4_N"].threshold == Decimal("50.000000")


def test_compliance_evaluation_readings(db_session: Session, test_facility):
    """Verify reading evaluation correctly identifies compliant and violation parameters."""
    rules = ComplianceService.ensure_default_rules(db_session)

    # 1. Compliant readings
    compliant_readings = [
        Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=datetime.now(timezone.utc),
            treatment_stage="final_effluent",
            parameter="BOD",
            value=Decimal("18.5"),
            unit="mg/L",
            quality_status="valid",
        ),
        Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=datetime.now(timezone.utc),
            treatment_stage="final_effluent",
            parameter="COD",
            value=Decimal("120.0"),
            unit="mg/L",
            quality_status="valid",
        ),
        Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=datetime.now(timezone.utc),
            treatment_stage="final_effluent",
            parameter="TSS",
            value=Decimal("25.0"),
            unit="mg/L",
            quality_status="valid",
        ),
        Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=datetime.now(timezone.utc),
            treatment_stage="final_effluent",
            parameter="PH",
            value=Decimal("7.2"),
            unit="pH units",
            quality_status="valid",
        ),
        Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=datetime.now(timezone.utc),
            treatment_stage="final_effluent",
            parameter="NH4_N",
            value=Decimal("10.0"),
            unit="mg/L",
            quality_status="valid",
        ),
    ]

    status, results = ComplianceService.evaluate_readings(compliant_readings, rules)
    assert status == "compliant"
    assert len(results) == 5
    assert results["BOD"]["status"] == "compliant"
    assert results["COD"]["status"] == "compliant"

    # 2. Violation readings (BOD exceeds 30)
    violation_readings = [
        Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=datetime.now(timezone.utc),
            treatment_stage="final_effluent",
            parameter="BOD",
            value=Decimal("45.0"),
            unit="mg/L",
            quality_status="valid",
        ),
        Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=datetime.now(timezone.utc),
            treatment_stage="final_effluent",
            parameter="PH",
            value=Decimal("9.8"),
            unit="pH units",
            quality_status="valid",
        ),
    ]
    status_v, results_v = ComplianceService.evaluate_readings(violation_readings, rules)
    assert status_v == "non_compliant"
    assert results_v["BOD"]["status"] == "non_compliant"
    assert results_v["PH"]["status"] == "non_compliant"


def test_composite_window_aggregation_and_finalization(db_session: Session, test_facility):
    """Test composite aggregation and atomic finalization."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=6)
    window_end = now

    # Insert readings across window
    for p, val, unit in [("BOD", Decimal("22.5"), "mg/L"), ("COD", Decimal("130.0"), "mg/L"), ("TSS", Decimal("35.0"), "mg/L"), ("PH", Decimal("7.4"), "pH units"), ("NH4_N", Decimal("15.0"), "mg/L")]:
        r = Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=window_start + timedelta(hours=1),
            treatment_stage="final_effluent",
            parameter=p,
            value=val,
            unit=unit,
            quality_status="valid",
        )
        db_session.add(r)
    db_session.commit()

    # 1. Aggregate window into eligible_for_finalization record
    record = TreatmentService.aggregate_window(
        db=db_session,
        facility_id=test_facility.facility_id,
        period_start=window_start,
        period_end=window_end,
    )
    assert record.record_state == "eligible_for_finalization"
    assert record.quality_status == "valid"
    assert record.compliance_status == "compliant"

    # 2. Finalize record
    finalized = TreatmentService.finalize_record(
        db=db_session,
        record=record,
        key_id="key-ecdsa-p256-01",
    )
    assert finalized.record_state == "finalized"
    assert finalized.canonical_hash is not None
    assert len(finalized.canonical_hash) == 64
    assert finalized.certificate_id is not None
    assert finalized.signature_id is not None

    # Verify Certificate was generated
    cert = db_session.query(Certificate).filter(Certificate.record_id == record.record_id).first()
    assert cert is not None
    assert cert.canonical_hash == finalized.canonical_hash
    assert cert.compliance_summary["compliance_status"] == "compliant"

    # Verify DLT Anchor was generated
    anchor = db_session.query(DLTAnchor).filter(DLTAnchor.record_id == record.record_id).first()
    assert anchor is not None
    assert anchor.canonical_hash == finalized.canonical_hash
    assert anchor.anchor_status == "pending"

    # Verify Audit Log
    audit = db_session.query(AuditLog).filter(
        AuditLog.resource_type == "treatment_record",
        AuditLog.action == "RECORD_FINALIZED",
    ).first()
    assert audit is not None


def test_treatment_api_endpoints(client: TestClient, db_session: Session, test_facility):
    """Test Compliance, Treatment Record, and Certificate HTTP endpoints."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=6)
    window_end = now

    # Insert readings
    for p, val, unit in [("BOD", Decimal("20.0"), "mg/L"), ("COD", Decimal("110.0"), "mg/L"), ("TSS", Decimal("30.0"), "mg/L"), ("PH", Decimal("7.1"), "pH units"), ("NH4_N", Decimal("12.0"), "mg/L")]:
        r = Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=window_start + timedelta(hours=2),
            treatment_stage="final_effluent",
            parameter=p,
            value=val,
            unit=unit,
            quality_status="valid",
        )
        db_session.add(r)
    db_session.commit()

    # 1. GET compliance rules
    rules_resp = client.get("/api/v1/compliance/rules")
    assert rules_resp.status_code == 200
    assert len(rules_resp.json()) >= 5

    # 2. POST finalize treatment window
    fin_resp = client.post(
        "/api/v1/treatment-records/finalize",
        json={
            "facility_id": str(test_facility.facility_id),
            "period_start": window_start.isoformat(),
            "period_end": window_end.isoformat(),
            "key_id": "key-ecdsa-p256-01",
        },
    )
    assert fin_resp.status_code == 201
    fin_data = fin_resp.json()
    assert fin_data["record_state"] == "finalized"
    assert fin_data["canonical_hash"] is not None
    record_id = fin_data["record_id"]

    # 3. GET treatment record by ID
    get_rec = client.get(f"/api/v1/treatment-records/{record_id}")
    assert get_rec.status_code == 200
    assert get_rec.json()["canonical_hash"] == fin_data["canonical_hash"]

    # 4. GET certificate by record ID
    get_cert = client.get(f"/api/v1/certificates/record/{record_id}")
    assert get_cert.status_code == 200
    assert get_cert.json()["canonical_hash"] == fin_data["canonical_hash"]

    # 5. GET compliance summary
    summ_resp = client.get("/api/v1/compliance/summary")
    assert summ_resp.status_code == 200
    assert summ_resp.json()["total_evaluations"] >= 1
