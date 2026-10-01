"""AquaTrust AI — Digital Certificates Router."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.treatment_repository import TreatmentRepository
from app.schemas.certificate import CertificateResponse
from app.core.security import get_current_user_claims

router = APIRouter(tags=["Digital Certificates"])


@router.get(
    "/certificates/{certificate_id}",
    response_model=CertificateResponse,
    summary="Get digital treatment certificate by UUID",
    dependencies=[Depends(get_current_user_claims)],
)
def get_certificate(certificate_id: UUID, db: Session = Depends(get_db)):
    """Retrieve digital certificate by certificate UUID."""
    treatment_repo = TreatmentRepository(db)
    cert = treatment_repo.get_certificate(certificate_id)
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Certificate {certificate_id} not found")

    record = treatment_repo.get_by_id(cert.record_id)

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
        facility_id=record.facility_id if record else None,
        period_start=record.period_start if record else None,
        period_end=record.period_end if record else None,
        quality_status=record.quality_status if record else None,
        anomaly_status=record.anomaly_status if record else None,
        compliance_status=record.compliance_status if record else None,
    )


@router.get(
    "/certificates/record/{record_id}",
    response_model=CertificateResponse,
    summary="Get digital certificate for a treatment record",
    dependencies=[Depends(get_current_user_claims)],
)
def get_certificate_by_record(record_id: UUID, db: Session = Depends(get_db)):
    """Retrieve digital certificate associated with a treatment record."""
    treatment_repo = TreatmentRepository(db)
    cert = treatment_repo.get_certificate_by_record_id(record_id)
    if not cert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No certificate found for record {record_id}")

    record = treatment_repo.get_by_id(cert.record_id)

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
        facility_id=record.facility_id if record else None,
        period_start=record.period_start if record else None,
        period_end=record.period_end if record else None,
        quality_status=record.quality_status if record else None,
        anomaly_status=record.anomaly_status if record else None,
        compliance_status=record.compliance_status if record else None,
    )

