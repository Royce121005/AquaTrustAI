"""AquaTrust AI — Treatment Record & Cryptographic Artifact Repository."""

from typing import Optional, List
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.base import utc_now
from app.models.treatment_record import TreatmentRecord
from app.models.compliance_result import ComplianceResult
from app.models.compliance_rule import ComplianceRule
from app.models.certificate import Certificate
from app.models.signing_key import SigningKey
from app.models.cryptographic_artifact import CryptographicArtifact
from app.models.dlt_anchor import DLTAnchor
from app.models.correction import Correction
from app.repositories.base import BaseRepository


class TreatmentRepository(BaseRepository[TreatmentRecord]):
    """Repository handling treatment records, certificates, cryptographic artifacts, and DLT anchors."""

    def __init__(self, db: Session):
        super().__init__(db, TreatmentRecord)

    def get_by_id(self, record_id: UUID) -> Optional[TreatmentRecord]:
        """Fetch treatment record by UUID."""
        return self.get(record_id)

    def get_by_hash(self, canonical_hash: str) -> Optional[TreatmentRecord]:
        """Fetch treatment record by SHA-256 canonical hash."""
        stmt = select(TreatmentRecord).where(TreatmentRecord.canonical_hash == canonical_hash)
        return self.db.scalars(stmt).first()

    def list_records(
        self,
        facility_id: Optional[UUID] = None,
        record_state: Optional[str] = None,
        compliance_status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[TreatmentRecord]:
        """List treatment records with filtering."""
        stmt = select(TreatmentRecord)
        if facility_id:
            stmt = stmt.where(TreatmentRecord.facility_id == facility_id)
        if record_state:
            stmt = stmt.where(TreatmentRecord.record_state == record_state)
        if compliance_status:
            stmt = stmt.where(TreatmentRecord.compliance_status == compliance_status)

        stmt = stmt.order_by(desc(TreatmentRecord.period_start)).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def get_by_facility_and_period(
        self,
        facility_id: UUID,
        period_start: datetime,
        period_end: datetime,
    ) -> Optional[TreatmentRecord]:
        """Fetch existing treatment record for exact facility and time window (excluding superseded)."""
        stmt = (
            select(TreatmentRecord)
            .where(
                TreatmentRecord.facility_id == facility_id,
                TreatmentRecord.period_start == period_start,
                TreatmentRecord.period_end == period_end,
                TreatmentRecord.record_state != "superseded_by_correction",
            )
            .order_by(desc(TreatmentRecord.created_at))
        )
        return self.db.scalars(stmt).first()

    # Compliance rules and results
    def get_active_compliance_rules(
        self,
        stage: Optional[str] = "final_effluent",
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None,
    ) -> List[ComplianceRule]:
        """Fetch active environmental compliance rules with stage and temporal filtering."""
        ref_start = period_start or utc_now()
        ref_end = period_end or utc_now()

        conditions = [
            ComplianceRule.active == True,
            ComplianceRule.effective_from <= ref_start,
            (ComplianceRule.effective_to.is_(None)) | (ComplianceRule.effective_to >= ref_end),
        ]
        if stage is not None:
            conditions.append((ComplianceRule.stage_scope == stage) | (ComplianceRule.stage_scope.is_(None)))

        stmt = select(ComplianceRule).where(*conditions)
        return list(self.db.scalars(stmt).all())

    def add_compliance_result(self, compliance_result: ComplianceResult) -> ComplianceResult:
        """Persist compliance evaluation result."""
        self.db.add(compliance_result)
        self.db.flush()
        return compliance_result

    def get_compliance_result(self, record_id: UUID) -> Optional[ComplianceResult]:
        """Fetch compliance result for a treatment record."""
        stmt = select(ComplianceResult).where(ComplianceResult.treatment_record_id == record_id)
        return self.db.scalars(stmt).first()

    # Certificates
    def add_certificate(self, certificate: Certificate) -> Certificate:
        """Persist digital treatment certificate."""
        self.db.add(certificate)
        self.db.flush()
        return certificate

    def get_certificate(self, certificate_id: UUID) -> Optional[Certificate]:
        """Fetch certificate by UUID."""
        return self.db.get(Certificate, certificate_id)

    def get_certificate_by_record_id(self, record_id: UUID) -> Optional[Certificate]:
        """Fetch certificate associated with a treatment record."""
        stmt = select(Certificate).where(Certificate.record_id == record_id)
        return self.db.scalars(stmt).first()

    def list_certificates(
        self,
        facility_id: Optional[UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Certificate]:
        """List certificates with optional filtering."""
        stmt = select(Certificate)
        if facility_id:
            stmt = stmt.join(TreatmentRecord, Certificate.record_id == TreatmentRecord.record_id).where(TreatmentRecord.facility_id == facility_id)
        if status:
            stmt = stmt.where(Certificate.status == status)
        stmt = stmt.order_by(desc(Certificate.issued_at)).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    # Signing keys & Cryptographic artifacts
    def get_signing_key(self, key_id: str) -> Optional[SigningKey]:
        """Fetch public verification key material."""
        return self.db.get(SigningKey, key_id)

    def add_signing_key(self, key: SigningKey) -> SigningKey:
        """Register public signing key material."""
        self.db.add(key)
        self.db.flush()
        return key

    def add_cryptographic_artifact(self, artifact: CryptographicArtifact) -> CryptographicArtifact:
        """Persist digital signature and hash artifact."""
        self.db.add(artifact)
        self.db.flush()
        return artifact

    def get_cryptographic_artifact(self, record_id: UUID) -> Optional[CryptographicArtifact]:
        """Fetch cryptographic artifact for a treatment record."""
        stmt = select(CryptographicArtifact).where(CryptographicArtifact.record_id == record_id)
        return self.db.scalars(stmt).first()

    # DLT Anchors
    def add_dlt_anchor(self, anchor: DLTAnchor) -> DLTAnchor:
        """Persist Hyperledger Fabric anchor metadata."""
        self.db.add(anchor)
        self.db.flush()
        return anchor

    def get_dlt_anchor_by_record_id(self, record_id: UUID) -> Optional[DLTAnchor]:
        """Fetch DLT anchor by treatment record UUID."""
        stmt = select(DLTAnchor).where(DLTAnchor.record_id == record_id)
        return self.db.scalars(stmt).first()

    def get_dlt_anchor_by_hash(self, canonical_hash: str) -> Optional[DLTAnchor]:
        """Fetch DLT anchor by canonical hash."""
        stmt = select(DLTAnchor).where(DLTAnchor.canonical_hash == canonical_hash)
        return self.db.scalars(stmt).first()

    def list_dlt_anchors(self, skip: int = 0, limit: int = 50) -> List[DLTAnchor]:
        """List all DLT anchors."""
        stmt = select(DLTAnchor).order_by(desc(DLTAnchor.event_timestamp)).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    # Corrections
    def create_correction(self, correction: Correction) -> Correction:
        """Persist append-only correction proposal."""
        self.db.add(correction)
        self.db.flush()
        return correction

    def get_correction(self, correction_id: UUID) -> Optional[Correction]:
        """Fetch correction by UUID."""
        return self.db.get(Correction, correction_id)

    def list_corrections_for_record(self, original_record_id: UUID) -> List[Correction]:
        """List all corrections referencing an original record."""
        stmt = select(Correction).where(Correction.original_record_id == original_record_id)
        return list(self.db.scalars(stmt).all())
