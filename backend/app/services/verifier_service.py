"""AquaTrust AI — Independent Cryptographic Verifier Service.

Executes a 4-stage independent trust verification pipeline:
Stage 1: Canonical Hash Integrity (reconstructs canonical atc-v1 payload and verifies SHA-256 hash)
Stage 2: Signature Authenticity (recovers public key and validates ECDSA ES256 signature)
Stage 3: Certificate Cross-Consistency (validates certificate hash and linkage against treatment record)
Stage 4: DLT Ledger Anchor Verification (validates ledger anchor existence, hash match, and status against DLT network)
"""

from typing import Dict, Any, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.db.base import utc_now
from app.models.treatment_record import TreatmentRecord
from app.models.certificate import Certificate
from app.models.signing_key import SigningKey
from app.models.dlt_anchor import DLTAnchor
from app.models.cryptographic_artifact import CryptographicArtifact
from app.repositories.treatment_repository import TreatmentRepository
from app.dlt.canonicalizer import canonicalize_treatment_record
from app.dlt.hasher import compute_sha256_hex
from app.dlt.signer import verify_signature
from app.dlt.gateway import dlt_gateway


class VerifierService:
    """Four-stage independent trust verifier engine."""

    @classmethod
    def verify_treatment_record(
        cls,
        db: Session,
        record_id: UUID,
    ) -> Dict[str, Any]:
        """Perform comprehensive 4-stage independent verification of a treatment record."""
        treatment_repo = TreatmentRepository(db)
        record = treatment_repo.get_by_id(record_id)

        if not record:
            return {
                "record_id": record_id,
                "overall_verdict": "RECORD_NOT_FOUND",
                "verification_timestamp": utc_now(),
                "stages": {},
                "canonical_hash": "",
                "tamper_detected": True,
            }

        stages = {}
        all_passed = True

        # Stage 1: Canonical Hash Integrity
        stage1_pass = False
        recalculated_hash = ""
        canonical_bytes = None

        comp_res = treatment_repo.get_compliance_result(record.record_id)
        compliance_summary = None
        if record.evidence_snapshot and isinstance(record.evidence_snapshot, dict):
            compliance_summary = record.evidence_snapshot.get("compliance_results")
        if compliance_summary is None and comp_res:
            compliance_summary = comp_res.parameter_results

        payload = {
            "record_id": str(record.record_id),
            "facility_id": str(record.facility_id),
            "period_start": record.period_start.isoformat(),
            "period_end": record.period_end.isoformat(),
            "record_version": record.record_version,
            "quality_status": record.quality_status,
            "anomaly_status": record.anomaly_status,
            "compliance_status": record.compliance_status,
            "compliance_summary": compliance_summary or {},
            "provenance": record.provenance or {},
        }
        canonical_bytes = canonicalize_treatment_record(payload)
        recalculated_hash = compute_sha256_hex(canonical_bytes)
        stage1_pass = bool(record.canonical_hash and recalculated_hash.lower() == record.canonical_hash.lower())

        stages["stage_1_hash_integrity"] = {
            "stage_name": "Canonical Hash Integrity",
            "status": "passed" if stage1_pass else "failed",
            "details": {
                "stored_hash": record.canonical_hash,
                "recalculated_hash": recalculated_hash,
                "match": stage1_pass,
            },
        }
        if not stage1_pass:
            all_passed = False

        # Stage 2: Signature Authenticity
        stage2_pass = False
        crypto_art = db.query(CryptographicArtifact).filter(
            CryptographicArtifact.record_id == record.record_id
        ).first()

        if crypto_art and canonical_bytes is not None:
            key = treatment_repo.get_signing_key(crypto_art.key_id)
            if key and key.public_key:
                try:
                    stage2_pass = verify_signature(
                        canonical_bytes=canonical_bytes,
                        signature_base64url=crypto_art.signature_value,
                        public_key_pem=key.public_key,
                    )
                except Exception:
                    stage2_pass = False

        stages["stage_2_signature_authenticity"] = {
            "stage_name": "Signature Authenticity",
            "status": "passed" if stage2_pass else "failed",
            "details": {
                "key_id": crypto_art.key_id if crypto_art else None,
                "signature_valid": stage2_pass,
            },
        }
        if not stage2_pass:
            all_passed = False

        # Stage 3: Certificate Consistency
        stage3_pass = False
        cert = treatment_repo.get_certificate_by_record_id(record.record_id)
        if cert and cert.canonical_hash and record.canonical_hash:
            if cert.canonical_hash.lower() == record.canonical_hash.lower() and cert.status == "valid":
                stage3_pass = True

        stages["stage_3_certificate_consistency"] = {
            "stage_name": "Certificate Cross-Consistency",
            "status": "passed" if stage3_pass else "failed",
            "details": {
                "certificate_id": str(cert.certificate_id) if cert else None,
                "certificate_status": cert.status if cert else "missing",
                "hash_match": (cert.canonical_hash.lower() == record.canonical_hash.lower()) if (cert and cert.canonical_hash and record.canonical_hash) else False,
            },
        }
        if not stage3_pass:
            all_passed = False

        # Stage 4: DLT Ledger Anchor Verification
        stage4_pass = False
        anchor = db.query(DLTAnchor).filter(
            DLTAnchor.record_id == record.record_id
        ).first()

        ledger_anchor = dlt_gateway.query_record_anchor(record.record_id)
        dlt_tx_id = None
        anchor_status = "missing"
        error_detail = None

        if ledger_anchor:
            dlt_tx_id = ledger_anchor.get("tx_id") or ledger_anchor.get("simulation_reference")
            anchor_status = ledger_anchor.get("status", "unknown")
            ledger_hash = ledger_anchor.get("record_hash") or ledger_anchor.get("canonical_hash")

            hash_matches = bool(ledger_hash and record.canonical_hash and ledger_hash.lower() == record.canonical_hash.lower())
            status_valid = (
                anchor_status in ("anchored", "confirmed", "valid", "pending")
                if dlt_gateway.mode == "SIMULATION"
                else anchor_status in ("anchored", "confirmed", "valid")
            )

            if hash_matches and status_valid:
                stage4_pass = True
            else:
                if not hash_matches:
                    error_detail = f"DLT ledger anchor hash mismatch: expected '{record.canonical_hash}', got '{ledger_hash}'"
                elif not status_valid:
                    error_detail = f"DLT ledger anchor status mismatch: status '{anchor_status}' is invalid"
        else:
            if anchor:
                dlt_tx_id = anchor.transaction_id or (anchor.network_reference or {}).get("simulation_reference")
                anchor_status = anchor.anchor_status
            error_detail = "Record anchor not found on DLT ledger network"

        stage4_details = {
            "stage_name": "DLT Ledger Anchor Verification",
            "status": "passed" if stage4_pass else "failed",
            "details": {
                "anchor_id": str(anchor.anchor_id) if anchor else None,
                "anchor_status": anchor_status,
                "transaction_id": dlt_tx_id,
                "ledger_match": stage4_pass,
                "mode": dlt_gateway.mode,
                "error": error_detail if not stage4_pass else None,
            },
        }
        stages["stage_4_dlt_anchor"] = stage4_details
        stages["stage_4_dlt_ledger_anchor"] = stage4_details
        if not stage4_pass:
            all_passed = False

        overall_verdict = "VERIFIED" if all_passed else (
            "TAMPER_DETECTED" if not stage1_pass else (
                "SIGNATURE_INVALID" if not stage2_pass else (
                    "CERTIFICATE_INVALID" if not stage3_pass else "DLT_MISMATCH"
                )
            )
        )

        superseding_rec = db.query(TreatmentRecord).filter(
            TreatmentRecord.supersedes_record_id == record.record_id
        ).first()
        is_superseded = bool(record.record_state == "superseded_by_correction" or superseding_rec)
        superseding_record_id = superseding_rec.record_id if superseding_rec else None

        return {
            "record_id": record.record_id,
            "record_version": record.record_version,
            "record_state": record.record_state,
            "is_superseded": is_superseded,
            "superseding_record_id": superseding_record_id,
            "certificate_id": record.certificate_id,
            "overall_verdict": overall_verdict,
            "verification_timestamp": utc_now(),
            "stages": stages,
            "canonical_hash": record.canonical_hash or "",
            "dlt_tx_id": dlt_tx_id,
            "tamper_detected": not all_passed,
        }
