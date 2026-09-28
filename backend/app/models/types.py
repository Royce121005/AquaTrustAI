"""AquaTrust AI — Dialect Adaptive Column Types.

Provides cross-database compatibility between PostgreSQL (production) and SQLite (testing).
"""

from datetime import datetime, timezone
from sqlalchemy import JSON, DateTime, TypeDecorator
from sqlalchemy.dialects.postgresql import JSONB

# JSONField: Native JSONB on PostgreSQL, standard JSON on SQLite
JSONField = JSONB().with_variant(JSON, 'sqlite')


class UTCDateTime(TypeDecorator):
    """DateTime type that guarantees UTC timezone awareness across SQLite and PostgreSQL."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            if isinstance(value, datetime):
                if value.tzinfo is None:
                    return value.replace(tzinfo=timezone.utc)
                return value.astimezone(timezone.utc)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            if isinstance(value, datetime):
                if value.tzinfo is None:
                    return value.replace(tzinfo=timezone.utc)
                return value.astimezone(timezone.utc)
        return value
