"""
AquaTrust AI — DLT & Cryptography Package
Authoritative implementation conforming to CRYPTOGRAPHY_SPECIFICATION.md v2.2.1
"""

from .canonicalizer import canonicalize_treatment_record
from .hasher import compute_canonical_hash
from .signer import (
    generate_key_pair,
    sign_canonical_payload,
    verify_signature,
    SigningKeyRegistry,
)
from .verifier import verify_treatment_record, VerificationReport
from .correction import create_corrected_record_bundle

__all__ = [
    "canonicalize_treatment_record",
    "compute_canonical_hash",
    "generate_key_pair",
    "sign_canonical_payload",
    "verify_signature",
    "SigningKeyRegistry",
    "verify_treatment_record",
    "VerificationReport",
    "create_corrected_record_bundle",
]
