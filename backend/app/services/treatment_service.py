"""AquaTrust AI — Treatment Record Aggregation & Finalization Engine.

Implements the authoritative 4-state lifecycle state machine:
  draft -> eligible_for_finalization -> finalized -> superseded_by_correction

Coordinates deterministic canonicalization (atc-v1), SHA-256 hashing,
ECDSA NIST P-256 digital signing, certificate generation, and DLT anchor registration.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, Any, List, Tuple
from uuid import uuid4, UUID
from sqlalchemy.orm import Session

from app.db.base import utc_now
from app.models.treatment_record import TreatmentRecord
from app.models.certificate import Certificate
from app.models.signing_key import SigningKey
from app.models.cryptographic_artifact import CryptographicArtifact
from app.models.dlt_anchor import DLTAnchor
from app.models.audit_log import AuditLog
from app.repositories.treatment_repository import TreatmentRepository
from app.repositories.reading_repository import ReadingRepository
from app.services.compliance_service import ComplianceService
from app.dlt.canonicalizer import canonicalize_treatment_record
from app.dlt.hasher import compute_sha256_hex
from app.dlt.signer import generate_key_pair, sign_canonical_payload


class TreatmentService:
    """Service executing 6h/24h composite aggregation and immutable record finalization."""

    DEFAULT_KEY_ID = "key-ecdsa-p256-01"
    _cached_private_key: Optional[str] = None

    @classmethod
    def ensure_signing_key(cls, db: Session, key_id: str = DEFAULT_KEY_ID) -> Tuple[SigningKey, str]:
        """Ensure active public signing key is registered in DB and return (SigningKey, private_key_pem)."""
        treatment_repo = TreatmentRepository(db)
        signing_key = treatment_repo.get_signing_key(key_id)

        if not signing_key or cls._cached_private_key is None:
            priv_pem, pub_pem = generate_key_pair(key_id)
            cls._cached_private_key = priv_pem

            if not signing_key:
                import hashlib
                fp = hashlib.sha256(pub_pem.encode("utf-8")).hexdigest()
                signing_key = SigningKey(
                    key_id=key_id,
                    algorithm="ES256",
                    curve="P-256",
                    public_key=pub_pem,
                    fingerprint=fp,
                    status="active",
                    created_at=utc_now(),
                )
                treatment_repo.add_signing_key(signing_key)
                db.flush()

        return signing_key, cls._cached_private_key

    @classmethod
    def aggregate_window(
        cls,
        db: Session,
        facility_id: UUID,
        period_start: datetime,
        period_end: datetime,
    ) -> TreatmentRecord:
        """Aggregates readings within a composite window into an eligible_for_finalization treatment record."""
        reading_repo = ReadingRepository(db)
        treatment_repo = TreatmentRepository(db)

        # 1. Fetch readings in window
        readings = reading_repo.get_readings(
            facility_id=facility_id,
            start_time=period_start,
            end_time=period_end,
            limit=1000,
        )

        # 2. Determine quality & anomaly statuses
        has_invalid = any(r.quality_status == "invalid" for r in readings)
        has_suspect = any(r.quality_status == "suspect" for r in readings)
        quality_status = "invalid" if has_invalid else ("suspect" if has_suspect else "valid")

        has_anomalous = False
        for r in readings:
            anom = reading_repo.get_anomaly_result(r.reading_id)
            if anom and anom.anomaly_status == "anomalous":
                has_anomalous = True
                break
        anomaly_status = "anomalous" if has_anomalous else "normal"

        # 3. Create or update treatment record
        record_id = uuid4()
        treatment_record = TreatmentRecord(
            record_id=record_id,
            facility_id=facility_id,
            period_start=period_start,
            period_end=period_end,
            record_version=1,
            record_state="eligible_for_finalization",
            quality_status=quality_status,
            anomaly_status=anomaly_status,
            compliance_status="pending",
            anchor_status="not_required",
            created_at=utc_now(),
        )
        treatment_repo.create(treatment_record)

        # 4. Evaluate compliance
        ComplianceService.evaluate_treatment_record(db, treatment_record)
        db.flush()

        return treatment_record

    @classmethod
    def finalize_record(
        cls,
        db: Session,
        record: TreatmentRecord,
        key_id: str = DEFAULT_KEY_ID,
    ) -> TreatmentRecord:
        """Atomic finalization transaction: freezes evidence snapshot, canonicalizes, hashes, signs, creates certificate and DLT anchor."""
        if record.record_state == "finalized":
            return record  # Idempotent

        treatment_repo = TreatmentRepository(db)
        reading_repo = ReadingRepository(db)

        # 1. Fetch all observations and compliance results to freeze evidence snapshot
        readings = reading_repo.get_readings(
            facility_id=record.facility_id,
            start_time=record.period_start,
            end_time=record.period_end,
            limit=1000,
        )
        comp_res = treatment_repo.get_compliance_result(record.record_id)

        evidence_snapshot = {
            "record_id": str(record.record_id),
            "facility_id": str(record.facility_id),
            "period_start": record.period_start.isoformat(),
            "period_end": record.period_end.isoformat(),
            "quality_status": record.quality_status,
            "anomaly_status": record.anomaly_status,
            "compliance_status": record.compliance_status,
            "compliance_results": comp_res.parameter_results if comp_res else {},
            "total_readings": len(readings),
            "frozen_at": utc_now().isoformat(),
        }

        # 2. Deterministic Canonicalization (atc-v1)
        canonical_dict = {
            "record_id": str(record.record_id),
            "facility_id": str(record.facility_id),
            "period_start": record.period_start.isoformat(),
            "period_end": record.period_end.isoformat(),
            "record_version": record.record_version,
            "quality_status": record.quality_status,
            "anomaly_status": record.anomaly_status,
            "compliance_status": record.compliance_status,
            "compliance_summary": comp_res.parameter_results if comp_res else {},
        }
        canonical_bytes = canonicalize_treatment_record(canonical_dict)

        # 3. SHA-256 Hashing
        canonical_hash = compute_sha256_hex(canonical_bytes)

        # 4. ECDSA P-256 Signing
        signing_key, priv_key_pem = cls.ensure_signing_key(db, key_id=key_id)
        sig_value = sign_canonical_payload(canonical_bytes, priv_key_pem)

        # 5. Persist Cryptographic Artifact
        sig_id = uuid4()
        crypto_art = CryptographicArtifact(
            signature_id=sig_id,
            record_id=record.record_id,
            canonicalization_version="atc-v1",
            hash_algorithm="SHA-256",
            canonical_hash=canonical_hash,
            signature_algorithm="ES256",
            signature_value=sig_value,
            key_id=signing_key.key_id,
            signed_at=utc_now(),
        )
        treatment_repo.add_cryptographic_artifact(crypto_art)

        # 6. Generate Certificate
        cert_id = uuid4()
        certificate = Certificate(
            certificate_id=cert_id,
            record_id=record.record_id,
            certificate_version="1.0.0",
            issuer_identity="did:aquatrust:authority:cpcb",
            issued_at=utc_now(),
            compliance_summary={
                "compliance_status": comp_res.compliance_status if comp_res else "unknown",
                "parameters": comp_res.parameter_results if comp_res else {},
            },
            canonical_hash=canonical_hash,
            signature_id=sig_id,
            status="valid",
        )
        treatment_repo.add_certificate(certificate)

        # 7. Create DLT Anchor (pending state for Fabric Gateway)
        anchor_id = uuid4()
        dlt_anchor = DLTAnchor(
            anchor_id=anchor_id,
            record_id=record.record_id,
            certificate_id=cert_id,
            facility_id=record.facility_id,
            event_timestamp=utc_now(),
            canonical_hash=canonical_hash,
            compliance_status=record.compliance_status,
            signature_metadata={"algorithm": "ES256", "key_id": signing_key.key_id},
            network_reference={"channel": "aquatrustchannel", "chaincode": "aquatrust-records"},
            anchor_status="pending",
            created_at=utc_now(),
        )
        treatment_repo.add_dlt_anchor(dlt_anchor)

        # 8. Freeze Record State
        record.record_state = "finalized"
        record.canonical_hash = canonical_hash
        record.signature_id = sig_id
        record.certificate_id = cert_id
        record.anchor_status = "pending"
        record.evidence_snapshot = evidence_snapshot
        record.canonical_payload = canonical_dict
        record.finalized_at = utc_now()

        # 9. Audit Trail
        audit = AuditLog(
            audit_log_id=uuid4(),
            action="RECORD_FINALIZED",
            resource_type="treatment_record",
            resource_id=record.record_id,
            outcome="success",
            audit_metadata={"canonical_hash": canonical_hash, "certificate_id": str(cert_id)},
            created_at=utc_now(),
        )
        db.add(audit)
        db.flush()

        return record
