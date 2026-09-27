"""AquaTrust AI — Database Declarative Base.

Authoritative base for SQLAlchemy models conforming to MASTER/DATABASE_SCHEMA.md.
"""

from datetime import datetime, timezone
from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase

# Naming convention for foreign keys, constraints, and indexes
POSTGRES_NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Base class for all persistent database entities."""

    metadata = MetaData(naming_convention=POSTGRES_NAMING_CONVENTION)


def utc_now() -> datetime:
    """Return current timestamp in UTC timezone."""
    return datetime.now(timezone.utc)
