"""AquaTrust AI — Cryptographic Artifact ORM Model."""

from uuid import uuid4
from sqlalchemy import Column, String, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import UTCDateTime


class CryptographicArtifact(Base):
    """Represents cryptographic proofs (hashes and digital signatures) for records."""

    __tablename__ = "cryptographic_artifacts"

    signature_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    record_id = Column(UUID(as_uuid=True), ForeignKey("treatment_records.record_id", ondelete="CASCADE"), unique=True, nullable=False)
    canonicalization_version = Column(String, nullable=False, default="atc-v1")
    hash_algorithm = Column(String, nullable=False, default="SHA-256")
    canonical_hash = Column(String(64), nullable=False)
    signature_algorithm = Column(String, nullable=False, default="ES256")
    signature_value = Column(String, nullable=False)
    key_id = Column(String, ForeignKey("signing_keys.key_id", ondelete="RESTRICT"), nullable=False)
    signed_at = Column(UTCDateTime, nullable=False, default=utc_now)

    __table_args__ = (
        Index("ix_crypto_artifacts_canonical_hash", "canonical_hash"),
    )

    # Relationships
    treatment_record = relationship("TreatmentRecord", back_populates="cryptographic_artifact")
    signing_key = relationship("SigningKey", back_populates="cryptographic_artifacts")
