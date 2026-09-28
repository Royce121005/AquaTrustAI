"""AquaTrust AI — Signing Key ORM Model."""

from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.db.base import Base, utc_now
from app.models.types import UTCDateTime


class SigningKey(Base):
    """Represents public verification material for ECDSA / Ed25519 signing keys."""

    __tablename__ = "signing_keys"

    key_id = Column(String, primary_key=True)  # e.g., 'key-ecdsa-p256-01'
    algorithm = Column(String, nullable=False, default="ES256")
    curve = Column(String, nullable=False, default="P-256")
    public_key = Column(String, nullable=False)  # PEM format
    fingerprint = Column(String, nullable=False)  # SHA-256 fingerprint
    status = Column(String, nullable=False, default="active")  # 'active', 'revoked', 'expired'
    created_at = Column(UTCDateTime, nullable=False, default=utc_now)
    revoked_at = Column(UTCDateTime, nullable=True)

    # Relationships
    cryptographic_artifacts = relationship("CryptographicArtifact", back_populates="signing_key")
