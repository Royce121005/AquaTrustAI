"""AquaTrust AI — Digital Treatment Certificate Service."""

from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session

from app.models.certificate import Certificate
from app.repositories.treatment_repository import TreatmentRepository


class CertificateService:
    """Service handling digital certificate retrieval and verification queries."""

    @classmethod
    def get_certificate(cls, db: Session, certificate_id: UUID) -> Optional[Certificate]:
        treatment_repo = TreatmentRepository(db)
        return treatment_repo.get_certificate(certificate_id)

    @classmethod
    def get_certificate_by_record_id(cls, db: Session, record_id: UUID) -> Optional[Certificate]:
        treatment_repo = TreatmentRepository(db)
        return treatment_repo.get_certificate_by_record_id(record_id)
