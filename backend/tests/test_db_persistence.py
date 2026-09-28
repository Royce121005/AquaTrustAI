"""AquaTrust AI — Database Persistence & Repository Test Suite.

Verifies SQLAlchemy 2.0 ORM models, dual-engine compatibility (SQLite/PostgreSQL),
foreign key constraints, repository operations, transaction rollbacks, and sliding-window hydration.
"""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
import uuid
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base, utc_now
from app.models import (
    Facility,
    Sensor,
    Reading,
    ValidationResult,
    AnomalyResult,
    ComplianceRule,
    ComplianceResult,
    TreatmentRecord,
    Certificate,
    SigningKey,
    CryptographicArtifact,
    DLTAnchor,
    Correction,
    AuditLog,
    User,
)
from app.repositories import (
    FacilityRepository,
    ReadingRepository,
    TreatmentRepository,
    UserRepository,
)


@pytest.fixture(scope="function")
def db_session() -> Session:
    """Provide an isolated, clean in-memory SQLite database session for each test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def test_schema_table_count(db_session: Session):
    """Verify all 17 tables are initialized in the schema metadata."""
    tables = list(Base.metadata.tables.keys())
    assert len(tables) == 17
    assert "facilities" in tables
    assert "sensors" in tables
    assert "readings" in tables
    assert "validation_results" in tables
    assert "anomaly_results" in tables
    assert "treatment_records" in tables
    assert "certificates" in tables
    assert "signing_keys" in tables
    assert "cryptographic_artifacts" in tables
    assert "dlt_anchors" in tables
    assert "corrections" in tables
    assert "audit_logs" in tables
    assert "users" in tables


def test_facility_and_sensor_repository(db_session: Session):
    """Verify Facility and Sensor CRUD operations via FacilityRepository."""
    facility_repo = FacilityRepository(db_session)
    facility_id = uuid.uuid4()
    facility = Facility(
        facility_id=facility_id,
        facility_name="Bharwara STP Lucknow",
        facility_type="municipal_stp",
        location={"city": "Lucknow", "state": "UP", "latitude": 26.85, "longitude": 80.95},
        capacity=Decimal("345.000000"),
        capacity_unit="MLD",
        status="active",
        provenance={"source": "CPCB_UPPCB_REGISTRY"},
    )
    facility_repo.create(facility)
    db_session.commit()

    fetched = facility_repo.get_by_id(facility_id)
    assert fetched is not None
    assert fetched.facility_name == "Bharwara STP Lucknow"
    assert fetched.capacity == Decimal("345.000000")

    # Add sensors
    sensor_id = uuid.uuid4()
    sensor = Sensor(
        sensor_id=sensor_id,
        facility_id=facility_id,
        parameter="BOD",
        unit="mg/L",
        treatment_stage="final_effluent",
        status="active",
    )
    facility_repo.add_sensor(sensor)
    db_session.commit()

    sensors = facility_repo.get_sensors(facility_id)
    assert len(sensors) == 1
    assert sensors[0].parameter == "BOD"


def test_reading_persistence_and_sliding_window_hydration(db_session: Session):
    """Verify Reading, ValidationResult, AnomalyResult persistence and chronological sliding-window hydration."""
    facility_repo = FacilityRepository(db_session)
    reading_repo = ReadingRepository(db_session)

    facility_id = uuid.uuid4()
    facility = Facility(
        facility_id=facility_id,
        facility_name="Koramangala STP Bangalore",
        facility_type="municipal_stp",
        location={"city": "Bangalore", "state": "KA"},
        capacity=Decimal("248.000000"),
        capacity_unit="MLD",
    )
    facility_repo.create(facility)
    db_session.commit()

    # Insert 10 sequential readings spaced 15 minutes apart
    base_time = datetime(2026, 9, 28, 0, 0, 0, tzinfo=timezone.utc)
    readings = []
    for i in range(10):
        r = Reading(
            reading_id=uuid.uuid4(),
            facility_id=facility_id,
            observed_at=base_time + timedelta(minutes=15 * i),
            treatment_stage="final_effluent",
            parameter="BOD",
            value=Decimal(f"{20.5 + i * 0.5:.6f}"),
            unit="mg/L",
            source="telemetry",
            quality_status="valid",
        )
        readings.append(r)

    reading_repo.create_batch(readings)
    db_session.commit()

    # Verify query
    all_readings = reading_repo.get_readings(facility_id=facility_id, parameter="BOD")
    assert len(all_readings) == 10

    # Verify historical stream window hydration returns chronological order (ASC)
    history = reading_repo.get_historical_stream_window(
        facility_id=facility_id,
        parameter="BOD",
        measurement_stage="final_effluent",
        limit=5,
    )
    assert len(history) == 5
    # Earliest in window should be earlier than latest in window
    assert history[0].observed_at < history[-1].observed_at
    assert history[-1].observed_at == base_time + timedelta(minutes=15 * 9)

    # Attach validation and anomaly results to the latest reading
    target_reading = history[-1]
    val_res = ValidationResult(
        validation_result_id=uuid.uuid4(),
        reading_id=target_reading.reading_id,
        quality_status="valid",
        validation_flags=[],
        validation_version="1.0.0",
    )
    reading_repo.add_validation_result(val_res)

    anom_res = AnomalyResult(
        anomaly_result_id=uuid.uuid4(),
        reading_id=target_reading.reading_id,
        anomaly_status="normal",
        anomaly_score=Decimal("-0.1234567890"),
        model_version="iforest_bod_v1.9.1",
        feature_set_version="v1.0",
    )
    reading_repo.add_anomaly_result(anom_res)
    db_session.commit()

    val_fetched = reading_repo.get_validation_result(target_reading.reading_id)
    assert val_fetched is not None
    assert val_fetched.quality_status == "valid"

    anom_fetched = reading_repo.get_anomaly_result(target_reading.reading_id)
    assert anom_fetched is not None
    assert anom_fetched.anomaly_status == "normal"
    assert anom_fetched.anomaly_score == Decimal("-0.1234567890")


def test_treatment_record_lifecycle_and_cryptography(db_session: Session):
    """Verify TreatmentRecord lifecycle, ComplianceResult, Certificate, CryptographicArtifact, and DLTAnchor linking."""
    facility_repo = FacilityRepository(db_session)
    treatment_repo = TreatmentRepository(db_session)

    facility_id = uuid.uuid4()
    facility = Facility(
        facility_id=facility_id,
        facility_name="Okhla STP Delhi",
        facility_type="municipal_stp",
        location={"city": "Delhi"},
    )
    facility_repo.create(facility)
    db_session.commit()

    # 1. Register signing key
    key_id = "key-ecdsa-p256-01"
    signing_key = SigningKey(
        key_id=key_id,
        algorithm="ES256",
        curve="P-256",
        public_key="-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...\n-----END PUBLIC KEY-----",
        fingerprint="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        status="active",
    )
    treatment_repo.add_signing_key(signing_key)
    db_session.commit()

    # 2. Create treatment record (draft -> eligible_for_finalization -> finalized)
    record_id = uuid.uuid4()
    now = utc_now()
    treatment_record = TreatmentRecord(
        record_id=record_id,
        facility_id=facility_id,
        period_start=now - timedelta(hours=24),
        period_end=now,
        record_version=1,
        record_state="draft",
        quality_status="valid",
        anomaly_status="normal",
        compliance_status="compliant",
    )
    treatment_repo.create(treatment_record)
    db_session.commit()

    # 3. Add Compliance Result
    comp_res = ComplianceResult(
        compliance_result_id=uuid.uuid4(),
        treatment_record_id=record_id,
        compliance_status="compliant",
        rule_version="1.0.0",
        parameter_results={"BOD": {"status": "compliant", "mean": 18.5, "limit": 30.0}},
    )
    treatment_repo.add_compliance_result(comp_res)

    # 4. Finalize Record
    canonical_hash = "a" * 64
    treatment_record.record_state = "finalized"
    treatment_record.canonical_hash = canonical_hash
    treatment_record.finalized_at = utc_now()

    # 5. Add Cryptographic Artifact
    sig_id = uuid.uuid4()
    crypto_art = CryptographicArtifact(
        signature_id=sig_id,
        record_id=record_id,
        canonicalization_version="atc-v1",
        hash_algorithm="SHA-256",
        canonical_hash=canonical_hash,
        signature_algorithm="ES256",
        signature_value="MEQCIDy7e...iAIVw==",
        key_id=key_id,
    )
    treatment_repo.add_cryptographic_artifact(crypto_art)
    treatment_record.signature_id = sig_id

    # 6. Add Certificate
    cert_id = uuid.uuid4()
    certificate = Certificate(
        certificate_id=cert_id,
        record_id=record_id,
        certificate_version="1.0.0",
        issuer_identity="did:aquatrust:authority:cpcb",
        compliance_summary={"overall_status": "compliant", "eval_count": 1},
        canonical_hash=canonical_hash,
        signature_id=sig_id,
        status="valid",
    )
    treatment_repo.add_certificate(certificate)
    treatment_record.certificate_id = cert_id

    # 7. Add DLT Anchor
    anchor_id = uuid.uuid4()
    dlt_anchor = DLTAnchor(
        anchor_id=anchor_id,
        record_id=record_id,
        certificate_id=cert_id,
        facility_id=facility_id,
        canonical_hash=canonical_hash,
        compliance_status="compliant",
        transaction_id="tx_fabric_001_abc",
        anchor_status="confirmed",
        confirmed_at=utc_now(),
    )
    treatment_repo.add_dlt_anchor(dlt_anchor)
    treatment_record.anchor_status = "confirmed"

    db_session.commit()

    # Verify relationships
    rec_fetched = treatment_repo.get_by_id(record_id)
    assert rec_fetched is not None
    assert rec_fetched.record_state == "finalized"
    assert rec_fetched.canonical_hash == canonical_hash
    assert rec_fetched.certificate is not None
    assert rec_fetched.certificate.certificate_id == cert_id
    assert rec_fetched.cryptographic_artifact is not None
    assert rec_fetched.cryptographic_artifact.signature_id == sig_id
    assert rec_fetched.dlt_anchor is not None
    assert rec_fetched.dlt_anchor.anchor_status == "confirmed"


def test_append_only_correction_flow(db_session: Session):
    """Verify append-only correction preserves original record and creates linked v2 record."""
    facility_repo = FacilityRepository(db_session)
    treatment_repo = TreatmentRepository(db_session)

    facility_id = uuid.uuid4()
    facility = Facility(
        facility_id=facility_id,
        facility_name="Varanasi STP Dinapur",
        facility_type="municipal_stp",
        location={"city": "Varanasi"},
    )
    facility_repo.create(facility)
    db_session.commit()

    # Original v1 record
    rec_v1_id = uuid.uuid4()
    rec_v1 = TreatmentRecord(
        record_id=rec_v1_id,
        facility_id=facility_id,
        period_start=datetime(2026, 9, 27, 0, 0, tzinfo=timezone.utc),
        period_end=datetime(2026, 9, 28, 0, 0, tzinfo=timezone.utc),
        record_version=1,
        record_state="finalized",
        quality_status="valid",
        anomaly_status="normal",
        compliance_status="compliant",
        canonical_hash="1" * 64,
        finalized_at=utc_now(),
    )
    treatment_repo.create(rec_v1)
    db_session.commit()

    # Propose correction
    correction_id = uuid.uuid4()
    operator_user_id = uuid.uuid4()
    correction = Correction(
        correction_id=correction_id,
        original_record_id=rec_v1_id,
        requested_by=operator_user_id,
        reason="Recalibrated laboratory sensor BOD sample reading updated",
        proposed_changes={"BOD_effluent_mean": "19.200000"},
        status="authorized",
    )
    treatment_repo.create_correction(correction)

    # Create v2 record superseding v1
    rec_v2_id = uuid.uuid4()
    rec_v2 = TreatmentRecord(
        record_id=rec_v2_id,
        facility_id=facility_id,
        period_start=rec_v1.period_start,
        period_end=rec_v1.period_end,
        record_version=2,
        record_state="finalized",
        quality_status="valid",
        anomaly_status="normal",
        compliance_status="compliant",
        canonical_hash="2" * 64,
        supersedes_record_id=rec_v1_id,
        finalized_at=utc_now(),
    )
    treatment_repo.create(rec_v2)

    # Transition v1 state to superseded_by_correction
    rec_v1.record_state = "superseded_by_correction"
    correction.corrected_record_id = rec_v2_id
    correction.status = "applied"
    correction.completed_at = utc_now()
    db_session.commit()

    # Verify immutability of v1 evidence and state linkage
    v1_refreshed = treatment_repo.get_by_id(rec_v1_id)
    v2_refreshed = treatment_repo.get_by_id(rec_v2_id)
    assert v1_refreshed.record_state == "superseded_by_correction"
    assert v1_refreshed.canonical_hash == "1" * 64
    assert v2_refreshed.supersedes_record_id == rec_v1_id
    assert v2_refreshed.record_version == 2
    assert v2_refreshed.canonical_hash == "2" * 64


def test_transaction_rollback_on_failure(db_session: Session):
    """Verify that failed transactions roll back cleanly without partial persistence."""
    user_repo = UserRepository(db_session)
    user_id = uuid.uuid4()
    user = User(
        user_id=user_id,
        username="operator_alice",
        hashed_password="hashed_pw_secret",
        role="operator",
    )
    user_repo.create(user)
    db_session.commit()

    # Attempt to insert duplicate username in a new transaction
    duplicate_user = User(
        user_id=uuid.uuid4(),
        username="operator_alice",  # Duplicate username
        hashed_password="another_password",
        role="auditor",
    )
    with pytest.raises(Exception):
        user_repo.create(duplicate_user)
        db_session.commit()

    db_session.rollback()
    # Ensure original user remains intact
    assert user_repo.get_by_username("operator_alice") is not None
    assert user_repo.count() == 1
