"""AquaTrust AI — Treatment Record Aggregation & Finalization Engine.

Implements the authoritative 4-state lifecycle state machine:
  draft -> eligible_for_finalization -> finalized -> superseded_by_correction

Coordinates deterministic canonicalization (atc-v1), SHA-256 hashing,
ECDSA NIST P-256 digital signing, certificate generation, and DLT anchor registration.
"""

import hashlib
import os
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
from app.dlt.signer import generate_key_pair, get_public_key_from_private_pem, sign_canonical_payload
from app.dlt.gateway import dlt_gateway


class TreatmentService:
    """Service executing 6h/24h composite aggregation and immutable record finalization."""

    DEFAULT_KEY_ID = "key-ecdsa-p256-01"
    _cached_private_key: Optional[str] = None

    @classmethod
    def ensure_signing_key(cls, db: Session, key_id: str = DEFAULT_KEY_ID) -> Tuple[SigningKey, str]:
        """Ensure active public signing key is registered in DB and return (SigningKey, private_key_pem)."""
        treatment_repo = TreatmentRepository(db)
        signing_key = treatment_repo.get_signing_key(key_id)

        # 1. Resolve private key from cache, env, file, or deterministic generator
        if cls._cached_private_key is None:
            env_pem = os.getenv("DLT_SIGNING_PRIVATE_KEY_PEM")
            key_file_path = os.getenv("DLT_SIGNING_PRIVATE_KEY_PATH") or os.getenv("DLT_SIGNING_KEY_FILE")

            if env_pem and env_pem.strip():
                pem_str = env_pem.strip()
                if "\\n" in pem_str and "\n" not in pem_str:
                    pem_str = pem_str.replace("\\n", "\n")
                cls._cached_private_key = pem_str
            elif key_file_path and os.path.isfile(key_file_path):
                try:
                    with open(key_file_path, "r", encoding="utf-8") as f:
                        cls._cached_private_key = f.read().strip()
                except Exception:
                    priv_pem, _ = generate_key_pair(key_id, deterministic=True)
                    cls._cached_private_key = priv_pem
            else:
                priv_pem, _ = generate_key_pair(key_id, deterministic=True)
                cls._cached_private_key = priv_pem

        # 2. If signing_key does not exist in DB, register it cleanly
        if not signing_key:
            pub_pem = get_public_key_from_private_pem(cls._cached_private_key)
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

        # 0. Check if an active/finalized treatment record already exists for this exact window
        existing_record = treatment_repo.get_by_facility_and_period(facility_id, period_start, period_end)
        if existing_record and existing_record.record_state == "finalized":
            return existing_record

        # 1. Fetch ALL readings in window without arbitrary truncation
        readings = reading_repo.get_readings_in_window(
            facility_id=facility_id,
            start_time=period_start,
            end_time=period_end,
        )

        record_id = existing_record.record_id if existing_record else uuid4()

        # Handle empty window (0 readings)
        if len(readings) == 0:
            provenance = {
                "source_type": "telemetry",
                "total_readings": 0,
                "reading_ids": [],
                "sensor_ids": [],
                "parameter_coverage": [],
                "aggregated_at": utc_now().isoformat(),
            }
            if existing_record:
                treatment_record = existing_record
                treatment_record.record_state = "draft"
                treatment_record.quality_status = "insufficient_data"
                treatment_record.anomaly_status = "insufficient_data"
                treatment_record.compliance_status = "pending"
                treatment_record.provenance = provenance
            else:
                treatment_record = TreatmentRecord(
                    record_id=record_id,
                    facility_id=facility_id,
                    period_start=period_start,
                    period_end=period_end,
                    record_version=1,
                    record_state="draft",
                    quality_status="insufficient_data",
                    anomaly_status="insufficient_data",
                    compliance_status="pending",
                    anchor_status="not_required",
                    provenance=provenance,
                    created_at=utc_now(),
                )
                treatment_repo.create(treatment_record)
            db.flush()
            return treatment_record

        # 2. Determine quality & anomaly statuses
        has_invalid = any(r.quality_status == "invalid" for r in readings)
        has_suspect = any(r.quality_status == "suspect" for r in readings)
        quality_status = "invalid" if has_invalid else ("suspect" if has_suspect else "valid")

        has_anomalous = False
        has_insufficient = False
        for r in readings:
            anom = reading_repo.get_anomaly_result(r.reading_id)
            if anom:
                if anom.anomaly_status == "anomalous":
                    has_anomalous = True
                elif anom.anomaly_status == "insufficient_data":
                    has_insufficient = True
        if has_anomalous:
            anomaly_status = "anomalous"
        elif has_insufficient:
            anomaly_status = "insufficient_data"
        else:
            anomaly_status = "normal"

        # 3. Populate provenance
        provenance = {
            "source_type": "telemetry",
            "total_readings": len(readings),
            "reading_ids": [str(r.reading_id) for r in readings],
            "sensor_ids": sorted(list(set(str(r.sensor_id) for r in readings if r.sensor_id))),
            "parameter_coverage": sorted(list(set(r.parameter.upper() for r in readings if r.parameter))),
            "aggregated_at": utc_now().isoformat(),
        }

        # 4. Create or reuse treatment record
        if existing_record:
            treatment_record = existing_record
            treatment_record.quality_status = quality_status
            treatment_record.anomaly_status = anomaly_status
            treatment_record.provenance = provenance
        else:
            treatment_record = TreatmentRecord(
                record_id=record_id,
                facility_id=facility_id,
                period_start=period_start,
                period_end=period_end,
                record_version=1,
                record_state="draft",
                quality_status=quality_status,
                anomaly_status=anomaly_status,
                compliance_status="pending",
                anchor_status="not_required",
                provenance=provenance,
                created_at=utc_now(),
            )
            treatment_repo.create(treatment_record)

        # 5. Evaluate compliance
        ComplianceService.evaluate_treatment_record(db, treatment_record)

        # 6. Determine record state
        if (
            quality_status == "valid"
            and anomaly_status != "insufficient_data"
            and treatment_record.compliance_status in ["compliant", "non_compliant"]
        ):
            treatment_record.record_state = "eligible_for_finalization"
        else:
            treatment_record.record_state = "draft"

        db.flush()
        return treatment_record

    @classmethod
    def finalize_record(
        cls,
        db: Session,
        record: TreatmentRecord,
        key_id: str = DEFAULT_KEY_ID,
        actor_id: Optional[UUID] = None,
        actor_role: Optional[str] = None,
    ) -> TreatmentRecord:
        """Atomic finalization transaction: freezes evidence snapshot, canonicalizes, hashes, signs, creates certificate and DLT anchor."""
        treatment_repo = TreatmentRepository(db)
        reading_repo = ReadingRepository(db)

        # Concurrency & Row Locking
        query = db.query(TreatmentRecord).filter(TreatmentRecord.record_id == record.record_id)
        if db.bind and db.bind.dialect.name != "sqlite":
            query = query.with_for_update()
        locked_record = query.first()
        if locked_record:
            record = locked_record

        # Check: If record.record_state == "finalized": return record (idempotent).
        if record.record_state == "finalized":
            return record

        # Enforce FINALIZATION_POLICY.md §4 matrix:
        if record.quality_status in ["invalid", "suspect", "insufficient_data"]:
            raise ValueError(f"Finalization rejected: Quality status is '{record.quality_status}' (must be 'valid')")

        if record.anomaly_status == "insufficient_data":
            raise ValueError("Finalization rejected: AI anomaly evidence is incomplete ('insufficient_data')")

        if record.compliance_status in ["pending", "not_applicable"]:
            raise ValueError(f"Finalization rejected: Compliance evaluation is '{record.compliance_status}' (must be 'compliant' or 'non_compliant')")

        if record.record_state != "eligible_for_finalization":
            raise ValueError(f"Finalization rejected: Record state is '{record.record_state}' (must be 'eligible_for_finalization')")

        # 1. Fetch all observations and compliance results to freeze evidence snapshot
        readings = reading_repo.get_readings_in_window(
            facility_id=record.facility_id,
            start_time=record.period_start,
            end_time=record.period_end,
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
            "reading_ids": [str(r.reading_id) for r in readings],
            "sensor_ids": sorted(list(set(str(r.sensor_id) for r in readings if r.sensor_id))),
            "parameters": {
                p: {"count": len([r for r in readings if r.parameter and r.parameter.upper() == p])}
                for p in set(r.parameter.upper() for r in readings if r.parameter)
            },
            "provenance": record.provenance or {},
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
            "provenance": record.provenance or {},
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

        # 7. Create DLT Anchor (and register with Fabric Gateway)
        dlt_res = dlt_gateway.anchor_record(
            record_id=record.record_id,
            record_hash=canonical_hash,
            facility_id=record.facility_id,
            compliance_status=record.compliance_status,
            signature_value=sig_value,
            key_id=signing_key.key_id,
        )

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
            network_reference={
                "channel": dlt_res.get("channel_id", "aquatrustchannel"),
                "chaincode": dlt_res.get("chaincode", "aquatrust-records"),
                "block_number": dlt_res.get("block_number"),
            },
            transaction_id=dlt_res.get("tx_id"),
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
        record.finalized_at = utc_now()

        # 9. Audit Trail
        audit = AuditLog(
            audit_log_id=uuid4(),
            actor_id=actor_id,
            actor_role=actor_role,
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
