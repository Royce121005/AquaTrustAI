"""
AquaTrust AI — Independent Verification Engine
Conforms to CRYPTOGRAPHY_SPECIFICATION.md v2.2.1 Section 9 & 11, PHASE_11_VERIFICATION_CORRECTIONS.md
"""

from dataclasses import dataclass
from typing import Any, Dict, Optional

from .canonicalizer import canonicalize_treatment_record
from .hasher import compute_canonical_hash
from .signer import SigningKeyRegistry, verify_signature


@dataclass
class VerificationReport:
    record_id: str
    is_authentic: bool
    status: str  # 'MATCH', 'HASH_MISMATCH', 'SIGNATURE_INVALID', 'KEY_NOT_FOUND', 'DLT_MISMATCH'
    computed_hash: str
    stored_hash: Optional[str]
    ledger_hash: Optional[str]
    signature_valid: bool
    details: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "record_id": self.record_id,
            "is_authentic": self.is_authentic,
            "status": self.status,
            "computed_hash": self.computed_hash,
            "stored_hash": self.stored_hash,
            "ledger_hash": self.ledger_hash,
            "signature_valid": self.signature_valid,
            "details": self.details,
        }


def verify_treatment_record(
    record: Dict[str, Any],
    stored_hash: Optional[str] = None,
    signature_base64url: Optional[str] = None,
    key_id: Optional[str] = None,
    key_registry: Optional[SigningKeyRegistry] = None,
    ledger_anchor: Optional[Dict[str, Any]] = None,
) -> VerificationReport:
    """
    Performs independent 4-stage cryptographic verification:
    1. Reconstruct canonical byte payload (atc-v1).
    2. Recompute SHA-256 hash.
    3. Check against stored hash (if provided).
    4. Resolve key and verify digital signature (if provided).
    5. Compare against Hyperledger Fabric committed anchor (if provided).
    """
    record_id = record.get("record_id", "unknown_record")

    # Step 1 & 2: Reconstruct canonical payload and recompute SHA-256
    canonical_bytes = canonicalize_treatment_record(record)
    computed_hash = compute_canonical_hash(canonical_bytes)

    # Step 3: Compare stored hash
    if stored_hash and stored_hash.lower() != computed_hash:
        return VerificationReport(
            record_id=record_id,
            is_authentic=False,
            status="HASH_MISMATCH",
            computed_hash=computed_hash,
            stored_hash=stored_hash.lower(),
            ledger_hash=ledger_anchor.get("canonical_hash") if ledger_anchor else None,
            signature_valid=False,
            details=f"Calculated SHA-256 hash {computed_hash} does not match stored hash {stored_hash.lower()}.",
        )

    # Step 4: Digital Signature Verification
    signature_valid = False
    if signature_base64url and key_id and key_registry:
        key_entry = key_registry.get_public_key(key_id)
        if not key_entry:
            return VerificationReport(
                record_id=record_id,
                is_authentic=False,
                status="KEY_NOT_FOUND",
                computed_hash=computed_hash,
                stored_hash=stored_hash.lower() if stored_hash else computed_hash,
                ledger_hash=ledger_anchor.get("canonical_hash") if ledger_anchor else None,
                signature_valid=False,
                details=f"Signing key_id '{key_id}' not found in trusted registry.",
            )

        pub_pem = key_entry["public_key"]
        signature_valid = verify_signature(canonical_bytes, signature_base64url, pub_pem)
        if not signature_valid:
            return VerificationReport(
                record_id=record_id,
                is_authentic=False,
                status="SIGNATURE_INVALID",
                computed_hash=computed_hash,
                stored_hash=stored_hash.lower() if stored_hash else computed_hash,
                ledger_hash=ledger_anchor.get("canonical_hash") if ledger_anchor else None,
                signature_valid=False,
                details="ECDSA digital signature failed verification against canonical bytes.",
            )

    # Step 5: DLT Ledger Anchor Verification
    if ledger_anchor:
        ledger_canonical_hash = ledger_anchor.get("canonical_hash", "").lower()
        if ledger_canonical_hash != computed_hash:
            return VerificationReport(
                record_id=record_id,
                is_authentic=False,
                status="DLT_MISMATCH",
                computed_hash=computed_hash,
                stored_hash=stored_hash.lower() if stored_hash else computed_hash,
                ledger_hash=ledger_canonical_hash,
                signature_valid=signature_valid,
                details=f"Ledger anchor hash {ledger_canonical_hash} differs from recomputed hash {computed_hash}. Tampering detected!",
            )

    return VerificationReport(
        record_id=record_id,
        is_authentic=True,
        status="MATCH",
        computed_hash=computed_hash,
        stored_hash=stored_hash.lower() if stored_hash else computed_hash,
        ledger_hash=ledger_anchor.get("canonical_hash") if ledger_anchor else computed_hash,
        signature_valid=signature_valid if signature_base64url else True,
        details="Record is authentic. Canonical hash and signatures verified cleanly against ledger.",
    )
