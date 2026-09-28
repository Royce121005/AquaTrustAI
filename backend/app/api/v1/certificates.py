"""AquaTrust AI — Digital Certificates Router."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.treatment_repository import TreatmentRepository
from app.schemas.certificate import CertificateResponse

router = APIRouter(tags=["Digital Certificates"])


@router.get(
    "/certificates/{certificate_id}",
    response_model=CertificateResponse,
    summary="Get digital treatment certificate by UUID",
)
def get_certificate(certificate_id: UUID, db: Session = Depends(get_db)):
    """Retrieve digital certificate by certificate UUID."""
    treatment_repo = TreatmentRepository(db)
    cert = treatment_repo.get_certificate(certificate_id)
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Certificate {certificate_id} not found")

    return CertificateResponse(
        certificate_id=cert.certificate_id,
        record_id=cert.record_id,
        certificate_version=cert.certificate_version,
        issuer_identity=cert.issuer_identity,
        issued_at=cert.issued_at,
        compliance_summary=cert.compliance_summary,
        canonical_hash=cert.canonical_hash,
        signature_id=cert.signature_id,
        dlt_anchor_id=cert.dlt_anchor_id,
        status=cert.status,
    )


@router.get(
    "/certificates/record/{record_id}",
    response_model=CertificateResponse,
    summary="Get digital certificate for a treatment record",
)
def get_certificate_by_record(record_id: UUID, db: Session = Depends(get_db)):
    """Retrieve digital certificate associated with a treatment record."""
    treatment_repo = TreatmentRepository(db)
    cert = treatment_repo.get_certificate_by_record_id(record_id)
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No certificate found for record {record_id}")

    return CertificateResponse(
        certificate_id=cert.certificate_id,
        record_id=cert.record_id,
        certificate_version=cert.certificate_version,
        issuer_identity=cert.issuer_identity,
        issued_at=cert.issued_at,
        compliance_summary=cert.compliance_summary,
        canonical_hash=cert.canonical_hash,
        signature_id=cert.signature_id,
        dlt_anchor_id=cert.dlt_anchor_id,
        status=cert.status,
    )
