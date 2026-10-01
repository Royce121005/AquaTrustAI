"""
AquaTrust AI — DLT Verification & Cryptography Unit Test Suite
Covers:
- atc-v1 canonicalization determinism
- SHA-256 hashing format and sensitivity
- ECDSA P-256 (ES256) signature generation and verification
- 4-stage independent verification & tamper detection
- Append-only correction lineage preservation
"""

import json
from pathlib import Path
import pytest

from app.dlt.canonicalizer import canonicalize_treatment_record, CANONICAL_VERSION
from app.dlt.hasher import compute_canonical_hash, validate_canonical_hash
from app.dlt.signer import (
    generate_key_pair,
    sign_canonical_payload,
    verify_signature,
    SigningKeyRegistry,
)
from app.dlt.verifier import verify_treatment_record
from app.dlt.correction import create_corrected_record_bundle

FIXTURES_PATH = Path(__file__).resolve().parent.parent.parent / "dlt" / "fixtures" / "sample_treatment_record.json"


SAMPLE_TREATMENT_RECORD_DATA = {
    "record_id": "rec_stp_001_20260927_001",
    "facility_id": "STP-KORAMANGALA-01",
    "period_start": "2026-09-27T00:00:00Z",
    "period_end": "2026-09-27T06:00:00Z",
    "record_version": 1,
    "record_state": "finalized",
    "quality_status": "VALID",
    "anomaly_status": "NORMAL",
    "compliance_status": "COMPLIANT",
    "provenance": {
        "source_dataset_ids": ["bangalore_clean_v1", "uci_etp_v1"],
        "model_version": "isolation_forest_v1.0.0",
        "rule_version": "CPCB_STP_2023_v1",
    },
    "evidence_snapshot": {
        "parameters": [
            {"parameter": "BOD", "value": 18.5, "unit": "mg/L", "threshold_max": 20.0, "compliance": "PASS"},
            {"parameter": "COD", "value": 85.0, "unit": "mg/L", "threshold_max": 250.0, "compliance": "PASS"},
            {"parameter": "pH", "value": 7.4, "unit": "pH", "threshold_min": 6.5, "threshold_max": 9.0, "compliance": "PASS"},
            {"parameter": "TSS", "value": 24.0, "unit": "mg/L", "threshold_max": 30.0, "compliance": "PASS"},
        ]
    },
    "finalized_at": "2026-09-27T06:05:00Z",
}


@pytest.fixture
def sample_record():
    if FIXTURES_PATH.exists():
        with open(FIXTURES_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return SAMPLE_TREATMENT_RECORD_DATA.copy()


class TestCanonicalization:
    def test_canonicalization_determinism(self, sample_record):
        # 1. Canonicalize original
        bytes_1 = canonicalize_treatment_record(sample_record)

        # 2. Scramble dictionary keys and order
        scrambled = {
            "evidence_snapshot": sample_record["evidence_snapshot"],
            "record_id": sample_record["record_id"],
            "facility_id": sample_record["facility_id"],
            "provenance": {
                "rule_version": sample_record["provenance"]["rule_version"],
                "source_dataset_ids": list(reversed(sample_record["provenance"]["source_dataset_ids"])),
                "model_version": sample_record["provenance"]["model_version"],
            },
            "compliance_status": sample_record["compliance_status"],
            "period_end": sample_record["period_end"],
            "period_start": sample_record["period_start"],
            "record_state": sample_record["record_state"],
            "quality_status": sample_record["quality_status"],
            "anomaly_status": sample_record["anomaly_status"],
            "record_version": sample_record["record_version"],
            "finalized_at": sample_record["finalized_at"],
        }
        bytes_2 = canonicalize_treatment_record(scrambled)

        # Must produce identical byte output
        assert bytes_1 == bytes_2

    def test_mutable_fields_excluded(self, sample_record):
        # Add mutable database/anchor fields that arrive post-finalization
        record_with_mutables = dict(sample_record)
        record_with_mutables["tx_id"] = "tx_99999_committed"
        record_with_mutables["dlt_anchor_id"] = "anchor_uuid_1234"
        record_with_mutables["anchor_status"] = "CONFIRMED"
        record_with_mutables["created_at"] = "2026-09-27T06:05:01Z"

        bytes_clean = canonicalize_treatment_record(sample_record)
        bytes_with_mutables = canonicalize_treatment_record(record_with_mutables)

        # Mutables must be stripped cleanly
        assert bytes_clean == bytes_with_mutables

    def test_canonical_version_injected(self, sample_record):
        canonical_bytes = canonicalize_treatment_record(sample_record)
        payload = json.loads(canonical_bytes.decode("utf-8"))
        assert payload.get("canonicalization_version") == CANONICAL_VERSION


class TestHashing:
    def test_sha256_format(self, sample_record):
        canonical_bytes = canonicalize_treatment_record(sample_record)
        hash_digest = compute_canonical_hash(canonical_bytes)

        assert len(hash_digest) == 64
        assert hash_digest.islower()
        assert validate_canonical_hash(hash_digest) is True

    def test_avalanche_effect_on_tamper(self, sample_record):
        canonical_bytes_1 = canonicalize_treatment_record(sample_record)
        hash_1 = compute_canonical_hash(canonical_bytes_1)

        # Subtle modification: change BOD from 18.5 to 18.6
        tampered_record = json.loads(json.dumps(sample_record))
        tampered_record["evidence_snapshot"]["parameters"][0]["value"] = 18.6

        canonical_bytes_2 = canonicalize_treatment_record(tampered_record)
        hash_2 = compute_canonical_hash(canonical_bytes_2)

        assert hash_1 != hash_2


class TestSignatures:
    def test_signature_lifecycle(self, sample_record):
        priv_pem, pub_pem = generate_key_pair("key_facility_01")
        registry = SigningKeyRegistry()
        registry.register_public_key("key_facility_01", pub_pem)

        canonical_bytes = canonicalize_treatment_record(sample_record)
        signature = sign_canonical_payload(canonical_bytes, priv_pem)

        # Signature verification succeeds
        assert verify_signature(canonical_bytes, signature, pub_pem) is True

        # Tampered bytes fail verification
        tampered_bytes = canonical_bytes.replace(b"18.5", b"18.6")
        assert verify_signature(tampered_bytes, signature, pub_pem) is False


class TestIndependentVerification:
    def test_successful_verification(self, sample_record):
        priv_pem, pub_pem = generate_key_pair("key_facility_01")
        registry = SigningKeyRegistry()
        registry.register_public_key("key_facility_01", pub_pem)

        canonical_bytes = canonicalize_treatment_record(sample_record)
        hash_digest = compute_canonical_hash(canonical_bytes)
        signature = sign_canonical_payload(canonical_bytes, priv_pem)

        # Mock committed ledger anchor
        mock_ledger_anchor = {
            "record_id": sample_record["record_id"],
            "canonical_hash": hash_digest,
            "compliance_status": sample_record["compliance_status"],
            "tx_id": "tx_ledger_001",
        }

        report = verify_treatment_record(
            record=sample_record,
            stored_hash=hash_digest,
            signature_base64url=signature,
            key_id="key_facility_01",
            key_registry=registry,
            ledger_anchor=mock_ledger_anchor,
        )

        assert report.is_authentic is True
        assert report.status == "MATCH"
        assert report.signature_valid is True

    def test_tamper_detection_flags_mismatch(self, sample_record):
        priv_pem, pub_pem = generate_key_pair("key_facility_01")
        registry = SigningKeyRegistry()
        registry.register_public_key("key_facility_01", pub_pem)

        # Original hash committed to ledger
        canonical_bytes = canonicalize_treatment_record(sample_record)
        original_hash = compute_canonical_hash(canonical_bytes)
        signature = sign_canonical_payload(canonical_bytes, priv_pem)

        mock_ledger_anchor = {
            "record_id": sample_record["record_id"],
            "canonical_hash": original_hash,
            "compliance_status": sample_record["compliance_status"],
        }

        # Tampered record (e.g. fraudulent compliance override)
        tampered = json.loads(json.dumps(sample_record))
        tampered["evidence_snapshot"]["parameters"][0]["value"] = 55.0  # Spiked BOD

        report = verify_treatment_record(
            record=tampered,
            stored_hash=original_hash,  # Claiming to be original
            signature_base64url=signature,
            key_id="key_facility_01",
            key_registry=registry,
            ledger_anchor=mock_ledger_anchor,
        )

        assert report.is_authentic is False
        assert report.status == "HASH_MISMATCH"
        assert "does not match stored hash" in report.details


class TestAppendOnlyCorrection:
    def test_correction_preserves_lineage(self, sample_record):
        modifications = {
            "evidence_snapshot": {
                "parameters": [
                    {
                        "parameter": "BOD",
                        "value": 19.0,
                        "unit": "mg/L",
                        "threshold_max": 20.0,
                        "compliance": "PASS",
                    }
                ]
            }
        }

        corrected_rec, audit_entry, chaincode_payload = create_corrected_record_bundle(
            original_record=sample_record,
            proposed_modifications=modifications,
            reason="Recalibration of BOD optical sensor drift",
            requested_by="operator_01",
            authorized_by="auditor_supervisor_02",
        )

        # 1. Original record ID preserved in supersedes link
        assert corrected_rec["supersedes_record_id"] == sample_record["record_id"]
        assert corrected_rec["record_version"] == 2

        # 2. Audit entry records actors and reason
        assert audit_entry["reason"] == "Recalibration of BOD optical sensor drift"
        assert audit_entry["requested_by"] == "operator_01"
        assert audit_entry["authorized_by"] == "auditor_supervisor_02"

        # 3. Chaincode payload matches RecordCorrectionLink schema
        assert chaincode_payload["original_record_id"] == sample_record["record_id"]
        assert chaincode_payload["corrected_record_id"] == corrected_rec["record_id"]
        assert chaincode_payload["reason"] == "Recalibration of BOD optical sensor drift"
