"""AquaTrust AI — Cryptographic Verification Router."""

from typing import Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.treatment_repository import TreatmentRepository
from app.services.verifier_service import VerifierService
from app.dlt.canonicalizer import canonicalize_treatment_record
from app.dlt.signer import verify_signature
from app.dlt.hasher import compute_sha256_hex
from app.schemas.verification import (
    VerificationResultResponse,
    VerifyProofRequest,
    VerifyProofResponse,
    PublicKeyResponse,
)

from app.core.security import get_current_user_claims

router = APIRouter(tags=["Cryptographic Verification & Trust"])


@router.post(
    "/verification/verify-record/{record_id}",
    response_model=VerificationResultResponse,
    summary="Execute 4-stage independent trust verification on a treatment record",
    dependencies=[Depends(get_current_user_claims)],
)
def verify_record(record_id: UUID, db: Session = Depends(get_db)):
    """Re-computes atc-v1 canonical hash, checks ECDSA signature, certificate and DLT ledger anchor."""
    result = VerifierService.verify_treatment_record(db, record_id)
    if result.get("overall_verdict") == "RECORD_NOT_FOUND":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Treatment record {record_id} not found")

    return VerificationResultResponse(
        record_id=result["record_id"],
        record_version=result.get("record_version", 1),
        record_state=result.get("record_state", "finalized"),
        is_superseded=result.get("is_superseded", False),
        superseding_record_id=result.get("superseding_record_id"),
        certificate_id=result.get("certificate_id"),
        overall_verdict=result["overall_verdict"],
        verification_timestamp=result["verification_timestamp"],
        stages=result["stages"],
        canonical_hash=result["canonical_hash"],
        dlt_tx_id=result.get("dlt_tx_id"),
        tamper_details=result.get("tamper_details"),
    )


@router.post(
    "/verification/records/{record_id}",
    response_model=VerificationResultResponse,
    summary="Alias for verify-record to match frontend contract",
    dependencies=[Depends(get_current_user_claims)],
)
def verify_record_alias(record_id: UUID, db: Session = Depends(get_db)):
    return verify_record(record_id=record_id, db=db)


@router.post(
    "/verification/public/verify/{record_id}",
    response_model=VerificationResultResponse,
    summary="Public independent 4-stage trust verification on a treatment record (unauthenticated)",
)
def verify_record_public(record_id: UUID, db: Session = Depends(get_db)):
    """Public unauthenticated endpoint allowing external verifiers, auditors, and regulators to verify records without internal JWT login."""
    result = VerifierService.verify_treatment_record(db, record_id)
    if result.get("overall_verdict") == "RECORD_NOT_FOUND":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Treatment record {record_id} not found")

    return VerificationResultResponse(
        record_id=result["record_id"],
        record_version=result.get("record_version", 1),
        record_state=result.get("record_state", "finalized"),
        is_superseded=result.get("is_superseded", False),
        superseding_record_id=result.get("superseding_record_id"),
        certificate_id=result.get("certificate_id"),
        overall_verdict=result["overall_verdict"],
        verification_timestamp=result["verification_timestamp"],
        stages=result["stages"],
        canonical_hash=result["canonical_hash"],
        dlt_tx_id=result.get("dlt_tx_id"),
        tamper_details=result.get("tamper_details"),
    )


@router.get(
    "/verification/public/verify/{record_id}",
    response_model=VerificationResultResponse,
    summary="Public independent 4-stage trust verification on a treatment record via GET (unauthenticated)",
)
def verify_record_public_get(record_id: UUID, db: Session = Depends(get_db)):
    """GET alias for public unauthenticated record verification."""
    return verify_record_public(record_id=record_id, db=db)


@router.get(
    "/verification/public/verify-certificate/{certificate_id}",
    response_model=VerificationResultResponse,
    summary="Public verification of compliance certificate and underlying treatment record by certificate ID (unauthenticated)",
)
def verify_certificate_public(certificate_id: UUID, db: Session = Depends(get_db)):
    """Resolves certificate_id to its treatment record and returns the complete 4-stage verification result."""
    treatment_repo = TreatmentRepository(db)
    cert = treatment_repo.get_certificate(certificate_id)
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Certificate {certificate_id} not found",
        )
    return verify_record_public(record_id=cert.record_id, db=db)


@router.post(
    "/verification/verify-proof",
    response_model=VerifyProofResponse,
    summary="Stateless standalone cryptographic proof verification",
)
def verify_proof(payload: VerifyProofRequest):
    """Verifies SHA-256 canonical hash and ECDSA NIST P-256 signature without database access."""
    try:
        canonical_bytes = canonicalize_treatment_record(payload.canonical_payload)
        calc_hash = compute_sha256_hex(canonical_bytes)
        hash_valid = (calc_hash.lower() == payload.canonical_hash.lower())

        sig_valid = verify_signature(
            canonical_bytes=canonical_bytes,
            signature_base64url=payload.signature,
            public_key_pem=payload.public_key_pem,
        )

        verdict = "VALID" if (hash_valid and sig_valid) else "INVALID"
        message = "Cryptographic proof is valid" if verdict == "VALID" else "Proof verification failed"

        return VerifyProofResponse(
            hash_valid=hash_valid,
            signature_valid=sig_valid,
            verdict=verdict,
            message=message,
        )
    except Exception as e:
        return VerifyProofResponse(
            hash_valid=False,
            signature_valid=False,
            verdict="INVALID",
            message=f"Verification error: {str(e)}",
        )


@router.get(
    "/verification/keys/{key_id}",
    response_model=PublicKeyResponse,
    summary="Discover active public key for signature verification",
)
def get_public_key(key_id: str, db: Session = Depends(get_db)):
    """Retrieve public key PEM and fingerprint."""
    treatment_repo = TreatmentRepository(db)
    key = treatment_repo.get_signing_key(key_id)
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Signing key {key_id} not found")

    return PublicKeyResponse(
        key_id=key.key_id,
        algorithm=key.algorithm,
        curve=key.curve,
        public_key_pem=key.public_key,
        fingerprint=key.fingerprint,
        status=key.status,
        created_at=key.created_at,
    )
