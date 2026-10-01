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

    # 4. GET certificate by record ID & by certificate ID
    get_cert = client.get(f"/api/v1/certificates/record/{record_id}")
    assert get_cert.status_code == 200
    cert_data = get_cert.json()
    assert cert_data["canonical_hash"] == fin_data["canonical_hash"]
    assert cert_data["facility_id"] == str(test_facility.facility_id)
    assert cert_data["quality_status"] == "valid"
    assert cert_data["compliance_status"] == "compliant"
    assert "period_start" in cert_data and cert_data["period_start"] is not None

    cert_id = cert_data["certificate_id"]
    get_cert_by_id = client.get(f"/api/v1/certificates/{cert_id}")
    assert get_cert_by_id.status_code == 200
    cert_by_id_data = get_cert_by_id.json()
    assert cert_by_id_data["certificate_id"] == cert_id
    assert cert_by_id_data["facility_id"] == str(test_facility.facility_id)
    assert cert_by_id_data["compliance_status"] == "compliant"

    # 5. GET compliance summary
    summ_resp = client.get("/api/v1/compliance/summary")
    assert summ_resp.status_code == 200
    assert summ_resp.json()["total_evaluations"] >= 1


def test_canonical_operators_and_threshold_edges(db_session: Session):
    """Test all canonical operators (lt, lte, gt, gte, eq, between) at and near thresholds."""
    rules = [
        ComplianceRule(
            rule_id=uuid4(),
            parameter="BOD",
            operator="lte",
            threshold=Decimal("30.0"),
            threshold_unit="mg/L",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            active=True,
        ),
        ComplianceRule(
            rule_id=uuid4(),
            parameter="COD",
            operator="lt",
            threshold=Decimal("250.0"),
            threshold_unit="mg/L",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            active=True,
        ),
        ComplianceRule(
            rule_id=uuid4(),
            parameter="DO",
            operator="gte",
            threshold=Decimal("4.0"),
            threshold_unit="mg/L",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            active=True,
        ),
        ComplianceRule(
            rule_id=uuid4(),
            parameter="CL2",
            operator="gt",
            threshold=Decimal("0.5"),
            threshold_unit="mg/L",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            active=True,
        ),
        ComplianceRule(
            rule_id=uuid4(),
            parameter="PH",
            operator="between",
            threshold_min=Decimal("5.5"),
            threshold_max=Decimal("9.0"),
            threshold_unit="pH units",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            active=True,
        ),
    ]

    # Test 1: Exactly at boundary for lte (30.0 is compliant for <= 30.0)
    # COD exactly at threshold 250.0 is non_compliant for < 250.0
    fac_id = uuid4()
    readings = [
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="BOD", value=Decimal("30.00"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="COD", value=Decimal("250.00"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="DO", value=Decimal("4.00"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="CL2", value=Decimal("0.50"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="PH", value=Decimal("5.50"), unit="pH units", quality_status="valid"),
    ]

    _, results = ComplianceService.evaluate_readings(readings, rules)
    assert results["BOD"]["status"] == "compliant"
    assert results["COD"]["status"] == "non_compliant"  # 250 is not < 250
    assert results["DO"]["status"] == "compliant"       # 4.0 >= 4.0 is compliant
    assert results["CL2"]["status"] == "non_compliant"  # 0.5 is not > 0.5
    assert results["PH"]["status"] == "compliant"       # 5.5 is within 5.5 - 9.0


def test_unit_normalization(db_session: Session):
    """Test unit conversions: g/L (*1000), ppm (*1.0), and unconvertible units."""
    rules = [
        ComplianceRule(
            rule_id=uuid4(),
            parameter="BOD",
            operator="lte",
            threshold=Decimal("30.0"),
            threshold_unit="mg/L",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            active=True,
        ),
        ComplianceRule(
            rule_id=uuid4(),
            parameter="COD",
            operator="lte",
            threshold=Decimal("250.0"),
            threshold_unit="mg/L",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            active=True,
        ),
        ComplianceRule(
            rule_id=uuid4(),
            parameter="TSS",
            operator="lte",
            threshold=Decimal("50.0"),
            threshold_unit="mg/L",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            active=True,
        ),
    ]

    fac_id = uuid4()
    # 0.025 g/L = 25 mg/L (compliant with <= 30 mg/L)
    # 200 ppm = 200 mg/L (compliant with <= 250 mg/L)
    # TSS unit = 'degC' (invalid unit for mg/L)
    readings = [
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="BOD", value=Decimal("0.025"), unit="g/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="COD", value=Decimal("200.0"), unit="ppm", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="TSS", value=Decimal("30.0"), unit="degC", quality_status="valid"),
    ]

    _, results = ComplianceService.evaluate_readings(readings, rules)
    assert results["BOD"]["status"] == "compliant"
    assert results["BOD"]["observed_value"] == 0.025
    assert results["BOD"]["observed_unit"] == "g/L"
    assert results["BOD"]["normalized_value"] == 25.0

    assert results["COD"]["status"] == "compliant"
    assert results["COD"]["normalized_value"] == 200.0

    assert results["TSS"]["status"] == "not_applicable"
    assert results["TSS"]["normalized_value"] is None
    assert "cannot be normalized" in results["TSS"]["reason"]


def test_stage_scope_isolation(db_session: Session):
    """Test that readings from non-matching stages are strictly isolated and not evaluated."""
    rules = [
        ComplianceRule(
            rule_id=uuid4(),
            parameter="BOD",
            operator="lte",
            threshold=Decimal("30.0"),
            threshold_unit="mg/L",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            active=True,
        ),
    ]

    fac_id = uuid4()
    # Inlet BOD reading is high (300 mg/L), but final_effluent BOD reading is 20 mg/L
    readings = [
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=datetime.now(timezone.utc), treatment_stage="inlet", parameter="BOD", value=Decimal("300.0"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="BOD", value=Decimal("20.0"), unit="mg/L", quality_status="valid"),
    ]

    _, results = ComplianceService.evaluate_readings(readings, rules)
    assert results["BOD"]["status"] == "compliant"
    assert results["BOD"]["sample_count"] == 1
    assert results["BOD"]["observed_value"] == 20.0


def test_quality_status_filtering(db_session: Session):
    """Test that invalid, suspect, and insufficient_data readings are excluded from arithmetic mean."""
    rules = [
        ComplianceRule(
            rule_id=uuid4(),
            parameter="BOD",
            operator="lte",
            threshold=Decimal("30.0"),
            threshold_unit="mg/L",
            stage_scope="final_effluent",
            rule_version="2.2.1",
            active=True,
        ),
    ]

    fac_id = uuid4()
    # 20 mg/L (valid), 100 mg/L (invalid), 200 mg/L (suspect)
    # If 100 and 200 were included, mean would be 106.67 (non-compliant)
    # Since excluded, mean is 20.0 (compliant)
    readings = [
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="BOD", value=Decimal("20.0"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="BOD", value=Decimal("100.0"), unit="mg/L", quality_status="invalid"),
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="BOD", value=Decimal("200.0"), unit="mg/L", quality_status="suspect"),
    ]

    _, results = ComplianceService.evaluate_readings(readings, rules)
    assert results["BOD"]["status"] == "compliant"
    assert results["BOD"]["sample_count"] == 1
    assert results["BOD"]["observed_value"] == 20.0


def test_mandatory_parameter_completeness_check(db_session: Session, test_facility):
    """Test that missing any mandatory parameter prevents 'compliant' overall status."""
    rules = ComplianceService.ensure_default_rules(db_session)

    # 4 compliant parameters, but NH4_N missing -> MUST be 'pending', NEVER 'compliant'
    partial_readings = [
        Reading(reading_id=uuid4(), facility_id=test_facility.facility_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="BOD", value=Decimal("18.5"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=test_facility.facility_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="COD", value=Decimal("120.0"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=test_facility.facility_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="TSS", value=Decimal("25.0"), unit="mg/L", quality_status="valid"),
        Reading(reading_id=uuid4(), facility_id=test_facility.facility_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="PH", value=Decimal("7.2"), unit="pH units", quality_status="valid"),
    ]

    status, results = ComplianceService.evaluate_readings(partial_readings, rules)
    assert status == "pending"
    assert len(results) == 4
    assert all(r["status"] == "compliant" for r in results.values())


def test_temporal_rule_filtering(db_session: Session):
    """Test temporal filtering in treatment repository for effective_from and effective_to."""
    from app.repositories.treatment_repository import TreatmentRepository
    repo = TreatmentRepository(db_session)

    # Clean existing rules
    db_session.query(ComplianceRule).delete()
    db_session.commit()

    now = datetime.now(timezone.utc)
    past_start = now - timedelta(days=30)
    past_end = now - timedelta(days=10)
    future_start = now + timedelta(days=10)

    # Historical rule (effective in past, expired)
    rule_old = ComplianceRule(
        rule_id=uuid4(),
        parameter="BOD",
        operator="lte",
        threshold=Decimal("35.0"),
        threshold_unit="mg/L",
        stage_scope="final_effluent",
        effective_from=past_start,
        effective_to=past_end,
        rule_version="0.9.0",
        active=True,
    )
    # Current active rule
    rule_current = ComplianceRule(
        rule_id=uuid4(),
        parameter="BOD",
        operator="lte",
        threshold=Decimal("30.0"),
        threshold_unit="mg/L",
        stage_scope="final_effluent",
        effective_from=past_end,
        effective_to=None,
        rule_version="1.0.0",
        active=True,
    )
    # Future rule (not yet effective)
    rule_future = ComplianceRule(
        rule_id=uuid4(),
        parameter="BOD",
        operator="lte",
        threshold=Decimal("20.0"),
        threshold_unit="mg/L",
        stage_scope="final_effluent",
        effective_from=future_start,
        effective_to=None,
        rule_version="2.0.0",
        active=True,
    )

    db_session.add_all([rule_old, rule_current, rule_future])
    db_session.commit()

    # Query for current window
    current_rules = repo.get_active_compliance_rules(stage="final_effluent", period_start=now, period_end=now)
    assert len(current_rules) == 1
    assert current_rules[0].rule_version == "1.0.0"

    # Query for historical window
    hist_rules = repo.get_active_compliance_rules(stage="final_effluent", period_start=past_start + timedelta(days=5), period_end=past_end - timedelta(days=1))
    assert len(hist_rules) == 1
    assert hist_rules[0].rule_version == "0.9.0"


def test_enriched_parameter_results_structure(db_session: Session):
    """Verify that all required enriched fields are present in parameter_results."""
    rules = ComplianceService.ensure_default_rules(db_session)
    fac_id = uuid4()
    readings = [
        Reading(reading_id=uuid4(), facility_id=fac_id, observed_at=datetime.now(timezone.utc), treatment_stage="final_effluent", parameter="BOD", value=Decimal("18.5"), unit="mg/L", quality_status="valid"),
    ]

    _, results = ComplianceService.evaluate_readings(readings, rules)
    bod = results["BOD"]

    # Verify all expected keys
    expected_keys = {
        "parameter", "observed_value", "observed_unit", "normalized_value",
        "rule_id", "rule_version", "operator", "threshold", "threshold_min",
        "threshold_max", "threshold_unit", "status", "result", "reason",
        "sample_count", "min_value", "max_value", "mean_value",
    }
    assert expected_keys.issubset(set(bod.keys()))
    assert bod["parameter"] == "BOD"
    assert bod["observed_value"] == 18.5
    assert bod["observed_unit"] == "mg/L"
    assert bod["normalized_value"] == 18.5
    assert bod["status"] == "compliant"
    assert bod["result"] == "compliant"
    assert "satisfies <= 30.00 mg/L" in bod["reason"]
    assert bod["sample_count"] == 1


def test_empty_window_aggregation_sets_insufficient_data_draft(db_session: Session, test_facility, client: TestClient):
    """Test aggregation of empty window sets quality/anomaly to insufficient_data, compliance to pending, state to draft."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=6)
    window_end = now

    record = TreatmentService.aggregate_window(
        db=db_session,
        facility_id=test_facility.facility_id,
        period_start=window_start,
        period_end=window_end,
    )
    assert record.record_state == "draft"
    assert record.quality_status == "insufficient_data"
    assert record.anomaly_status == "insufficient_data"
    assert record.compliance_status == "pending"
    assert record.provenance["source_type"] == "telemetry"
    assert record.provenance["total_readings"] == 0
    assert record.provenance["reading_ids"] == []
    assert record.provenance["sensor_ids"] == []
    assert record.provenance["parameter_coverage"] == []

    # Finalization must be rejected
    with pytest.raises(ValueError, match="Finalization rejected"):
        TreatmentService.finalize_record(db=db_session, record=record)

    # Calling via API must return 422
    resp = client.post(
        "/api/v1/treatment-records/finalize",
        json={
            "facility_id": str(test_facility.facility_id),
            "period_start": window_start.isoformat(),
            "period_end": window_end.isoformat(),
        },
    )
    assert resp.status_code == 422


def test_finalization_eligibility_gate_rejects_invalid_quality(db_session: Session, test_facility):
    """Test that a window with invalid readings is marked invalid, draft, and rejected at finalization."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=6)
    window_end = now

    # Insert readings including an invalid one
    for p, val, unit, q_status in [
        ("BOD", Decimal("20.0"), "mg/L", "valid"),
        ("COD", Decimal("120.0"), "mg/L", "invalid"),
        ("TSS", Decimal("30.0"), "mg/L", "valid"),
        ("PH", Decimal("7.2"), "pH units", "valid"),
        ("NH4_N", Decimal("10.0"), "mg/L", "valid"),
    ]:
        r = Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=window_start + timedelta(hours=1),
            treatment_stage="final_effluent",
            parameter=p,
            value=val,
            unit=unit,
            quality_status=q_status,
        )
        db_session.add(r)
    db_session.commit()

    record = TreatmentService.aggregate_window(
        db=db_session,
        facility_id=test_facility.facility_id,
        period_start=window_start,
        period_end=window_end,
    )
    assert record.quality_status == "invalid"
    assert record.record_state == "draft"

    with pytest.raises(ValueError, match="Quality status is 'invalid'"):
        TreatmentService.finalize_record(db=db_session, record=record)


def test_finalization_eligibility_gate_rejects_suspect_quality(db_session: Session, test_facility):
    """Test that a window with suspect readings is marked suspect, draft, and rejected at finalization."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=6)
    window_end = now

    # Insert readings including a suspect one
    for p, val, unit, q_status in [
        ("BOD", Decimal("20.0"), "mg/L", "valid"),
        ("COD", Decimal("120.0"), "mg/L", "suspect"),
        ("TSS", Decimal("30.0"), "mg/L", "valid"),
        ("PH", Decimal("7.2"), "pH units", "valid"),
        ("NH4_N", Decimal("10.0"), "mg/L", "valid"),
    ]:
        r = Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=window_start + timedelta(hours=1),
            treatment_stage="final_effluent",
            parameter=p,
            value=val,
            unit=unit,
            quality_status=q_status,
        )
        db_session.add(r)
    db_session.commit()

    record = TreatmentService.aggregate_window(
        db=db_session,
        facility_id=test_facility.facility_id,
        period_start=window_start,
        period_end=window_end,
    )
    assert record.quality_status == "suspect"
    assert record.record_state == "draft"

    with pytest.raises(ValueError, match="Quality status is 'suspect'"):
        TreatmentService.finalize_record(db=db_session, record=record)


def test_finalization_eligibility_gate_rejects_pending_compliance(db_session: Session, test_facility):
    """Test that a window with missing mandatory parameters has pending compliance, draft state, and is rejected."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=6)
    window_end = now

    # Insert only 2 parameters (BOD, COD) -> missing TSS, PH, NH4_N -> compliance is pending
    for p, val, unit in [
        ("BOD", Decimal("20.0"), "mg/L"),
        ("COD", Decimal("120.0"), "mg/L"),
    ]:
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

    record = TreatmentService.aggregate_window(
        db=db_session,
        facility_id=test_facility.facility_id,
        period_start=window_start,
        period_end=window_end,
    )
    assert record.quality_status == "valid"
    assert record.compliance_status == "pending"
    assert record.record_state == "draft"

    with pytest.raises(ValueError, match="Compliance evaluation is 'pending'"):
        TreatmentService.finalize_record(db=db_session, record=record)


def test_finalization_preserves_reading_ids_and_sensor_ids_in_evidence_snapshot(db_session: Session, test_facility):
    """Test that finalization freezes full provenance, reading_ids, sensor_ids, and parameter counts in evidence snapshot."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=6)
    window_end = now

    reading_ids = []
    sensor_id_1 = uuid4()
    sensor_id_2 = uuid4()

    sensors = [
        Sensor(sensor_id=sensor_id_1, facility_id=test_facility.facility_id, parameter="BOD", unit="mg/L", treatment_stage="final_effluent", status="active"),
        Sensor(sensor_id=sensor_id_2, facility_id=test_facility.facility_id, parameter="COD", unit="mg/L", treatment_stage="final_effluent", status="active"),
    ]
    db_session.add_all(sensors)
    db_session.commit()

    readings_spec = [
        ("BOD", Decimal("20.0"), "mg/L", sensor_id_1),
        ("COD", Decimal("120.0"), "mg/L", sensor_id_2),
        ("TSS", Decimal("30.0"), "mg/L", None),
        ("PH", Decimal("7.2"), "pH units", None),
        ("NH4_N", Decimal("10.0"), "mg/L", None),
    ]
    for p, val, unit, s_id in readings_spec:
        r_id = uuid4()
        reading_ids.append(str(r_id))
        r = Reading(
            reading_id=r_id,
            sensor_id=s_id,
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

    record = TreatmentService.aggregate_window(
        db=db_session,
        facility_id=test_facility.facility_id,
        period_start=window_start,
        period_end=window_end,
    )
    assert record.record_state == "eligible_for_finalization"
    assert record.provenance["total_readings"] == 5
    assert set(record.provenance["reading_ids"]) == set(reading_ids)
    assert set(record.provenance["sensor_ids"]) == {str(sensor_id_1), str(sensor_id_2)}
    assert set(record.provenance["parameter_coverage"]) == {"BOD", "COD", "TSS", "PH", "NH4_N"}

    finalized = TreatmentService.finalize_record(db=db_session, record=record)
    snapshot = finalized.evidence_snapshot
    assert snapshot["total_readings"] == 5
    assert set(snapshot["reading_ids"]) == set(reading_ids)
    assert set(snapshot["sensor_ids"]) == {str(sensor_id_1), str(sensor_id_2)}
    assert "parameters" in snapshot
    assert snapshot["parameters"]["BOD"]["count"] == 1
    assert snapshot["parameters"]["COD"]["count"] == 1
    assert snapshot["provenance"] == record.provenance


def test_finalization_concurrency_idempotency(db_session: Session, test_facility):
    """Test that finalize_record is idempotent and returns the same record when called repeatedly."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=6)
    window_end = now

    for p, val, unit in [
        ("BOD", Decimal("22.0"), "mg/L"),
        ("COD", Decimal("130.0"), "mg/L"),
        ("TSS", Decimal("35.0"), "mg/L"),
        ("PH", Decimal("7.3"), "pH units"),
        ("NH4_N", Decimal("11.0"), "mg/L"),
    ]:
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

    record = TreatmentService.aggregate_window(
        db=db_session,
        facility_id=test_facility.facility_id,
        period_start=window_start,
        period_end=window_end,
    )
    first_finalized = TreatmentService.finalize_record(db=db_session, record=record)
    hash_1 = first_finalized.canonical_hash
    cert_1 = first_finalized.certificate_id
    sig_1 = first_finalized.signature_id

    # Second call on finalized record
    second_finalized = TreatmentService.finalize_record(db=db_session, record=first_finalized)
    assert second_finalized.record_state == "finalized"
    assert second_finalized.canonical_hash == hash_1
    assert second_finalized.certificate_id == cert_1
    assert second_finalized.signature_id == sig_1


def test_ph_instantaneous_excursion_fails_compliance(db_session: Session, test_facility):
    """Verify instantaneous pH excursions fail compliance even when arithmetic mean is within 5.5-9.0."""
    now = datetime.now(timezone.utc)
    rules = ComplianceService.ensure_default_rules(db_session)

    # 5 pH readings whose mean is (7.0*3 + 3.5 + 9.5) / 5 = 34.0 / 5 = 6.8 (nominally in [5.5, 9.0]),
    # but individual values breach lower (3.5) and upper (9.5) limits.
    readings = [
        Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=now - timedelta(minutes=50),
            treatment_stage="final_effluent",
            parameter="BOD",
            value=Decimal("20.0"),
            unit="mg/L",
            quality_status="valid",
        ),
        Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=now - timedelta(minutes=50),
            treatment_stage="final_effluent",
            parameter="COD",
            value=Decimal("120.0"),
            unit="mg/L",
            quality_status="valid",
        ),
        Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=now - timedelta(minutes=50),
            treatment_stage="final_effluent",
            parameter="TSS",
            value=Decimal("25.0"),
            unit="mg/L",
            quality_status="valid",
        ),
        Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=now - timedelta(minutes=50),
            treatment_stage="final_effluent",
            parameter="NH4_N",
            value=Decimal("10.0"),
            unit="mg/L",
            quality_status="valid",
        ),
    ]

    for ph_val in [Decimal("7.0"), Decimal("7.0"), Decimal("7.0"), Decimal("3.5"), Decimal("9.5")]:
        readings.append(
            Reading(
                reading_id=uuid4(),
                facility_id=test_facility.facility_id,
                observed_at=now - timedelta(minutes=30),
                treatment_stage="final_effluent",
                parameter="PH",
                value=ph_val,
                unit="pH units",
                quality_status="valid",
            )
        )

    overall_status, param_results = ComplianceService.evaluate_readings(readings, rules)

    # Compliance MUST fail because 3.5 < 5.5 and 9.5 > 9.0
    assert overall_status == "non_compliant"
    assert param_results["PH"]["status"] == "non_compliant"
    assert param_results["PH"]["min_value"] == 3.5
    assert param_results["PH"]["max_value"] == 9.5
    assert param_results["PH"]["mean_value"] == 6.8
    assert "falls below lower limit" in param_results["PH"]["reason"]


def test_window_idempotency_api_endpoint(client: TestClient, db_session: Session, test_facility):
    """Test that duplicate POST /treatment-records/finalize calls return HTTP 200 with identical record."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=4)
    window_end = now

    for p, val, unit in [
        ("BOD", Decimal("18.0"), "mg/L"),
        ("COD", Decimal("110.0"), "mg/L"),
        ("TSS", Decimal("22.0"), "mg/L"),
        ("PH", Decimal("7.4"), "pH units"),
        ("NH4_N", Decimal("9.0"), "mg/L"),
    ]:
        r = Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=window_start + timedelta(minutes=30),
            treatment_stage="final_effluent",
            parameter=p,
            value=val,
            unit=unit,
            quality_status="valid",
        )
        db_session.add(r)
    db_session.commit()

    payload = {
        "facility_id": str(test_facility.facility_id),
        "period_start": window_start.isoformat(),
        "period_end": window_end.isoformat(),
        "key_id": "key-ecdsa-p256-01",
    }

    # 1. First finalize call: creates new finalized record (HTTP 201)
    resp1 = client.post("/api/v1/treatment-records/finalize", json=payload)
    assert resp1.status_code == 201
    data1 = resp1.json()
    assert data1["record_state"] == "finalized"
    rec_id1 = data1["record_id"]
    hash1 = data1["canonical_hash"]
    cert_id1 = data1["certificate_id"]

    # 2. Second finalize call with identical facility & window: returns HTTP 200 idempotently
    resp2 = client.post("/api/v1/treatment-records/finalize", json=payload)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["record_id"] == rec_id1
    assert data2["canonical_hash"] == hash1
    assert data2["certificate_id"] == cert_id1

    # Verify database has exactly 1 treatment record row
    records = db_session.query(TreatmentRecord).filter(
        TreatmentRecord.facility_id == test_facility.facility_id
    ).all()
    assert len(records) == 1


def test_list_certificates_api_endpoint(client: TestClient, db_session: Session, test_facility):
    """Test GET /api/v1/certificates endpoint with pagination and filtering."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=3)
    window_end = now

    for p, val, unit in [
        ("BOD", Decimal("19.0"), "mg/L"),
        ("COD", Decimal("115.0"), "mg/L"),
        ("TSS", Decimal("24.0"), "mg/L"),
        ("PH", Decimal("7.1"), "pH units"),
        ("NH4_N", Decimal("8.5"), "mg/L"),
    ]:
        r = Reading(
            reading_id=uuid4(),
            facility_id=test_facility.facility_id,
            observed_at=window_start + timedelta(minutes=20),
            treatment_stage="final_effluent",
            parameter=p,
            value=val,
            unit=unit,
            quality_status="valid",
        )
        db_session.add(r)
    db_session.commit()

    # Finalize window to generate certificate
    fin_resp = client.post(
        "/api/v1/treatment-records/finalize",
        json={
            "facility_id": str(test_facility.facility_id),
            "period_start": window_start.isoformat(),
            "period_end": window_end.isoformat(),
        },
    )
    assert fin_resp.status_code == 201

    # Query all certificates
    list_resp = client.get("/api/v1/certificates")
    assert list_resp.status_code == 200
    certs = list_resp.json()
    assert len(certs) >= 1

    cert = certs[0]
    assert cert["facility_id"] == str(test_facility.facility_id)
    assert cert["compliance_status"] == "compliant"
    assert cert["quality_status"] == "valid"
    assert cert["status"] == "valid"

    # Filter by facility_id
    fac_resp = client.get(f"/api/v1/certificates?facility_id={test_facility.facility_id}")
    assert fac_resp.status_code == 200
    assert len(fac_resp.json()) >= 1

    # Filter by unknown facility
    unknown_id = uuid4()
    empty_resp = client.get(f"/api/v1/certificates?facility_id={unknown_id}")
    assert empty_resp.status_code == 200
    assert len(empty_resp.json()) == 0


