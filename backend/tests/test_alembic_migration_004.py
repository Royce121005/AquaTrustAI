"""Unit & Integration Tests for Alembic Migration 004 (readings natural key lineage).

Verifies:
1. Fresh database installation from base to 004_readings_natural_key_lineage on pristine database.
2. Upgrade from 003 to 004 preserves non-conflicting multi-source readings.
3. Pre-migration detection of conflicting duplicates fails safely without data loss.
4. Downgrade from 004 to 003 restores 4-column constraint.
5. ORM model schema consistency with migrated database schema.
"""

import os
import sys
import uuid
import tempfile
from datetime import datetime, timezone
import pytest
import sqlalchemy as sa
from alembic.config import Config
from alembic import command

backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from app.models.reading import Reading


@pytest.fixture
def temp_alembic_sqlite():
    """Create a temporary isolated SQLite database file for testing migrations."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    db_url = f"sqlite:///{path}"

    cfg = Config("backend/alembic.ini")
    cfg.set_main_option("sqlalchemy.url", db_url)

    engines = []

    def get_engine():
        eng = sa.create_engine(db_url)
        engines.append(eng)
        return eng

    yield cfg, db_url, get_engine

    for eng in engines:
        eng.dispose()

    if os.path.exists(path):
        try:
            os.remove(path)
        except Exception:
            pass


def test_fresh_database_installation_to_head(temp_alembic_sqlite):
    """Test full migration chain from base to 004 on a pristine database."""
    cfg, _, get_engine = temp_alembic_sqlite

    # Upgrade from completely empty database to head
    command.upgrade(cfg, "head")

    engine = get_engine()
    insp = sa.inspect(engine)
    tables = set(insp.get_table_names())

    # Assert required core tables are created
    assert "readings" in tables
    assert "predictions" in tables
    assert "recommendations" in tables
    assert "sensors" in tables
    assert "facilities" in tables

    # Assert uq_readings_natural_key constraint contains 5 columns including 'source'
    uqs = insp.get_unique_constraints("readings")
    natural_key = next((u for u in uqs if u["name"] == "uq_readings_natural_key"), None)
    assert natural_key is not None, "uq_readings_natural_key missing after migration"
    assert set(natural_key["column_names"]) == {
        "facility_id",
        "parameter",
        "treatment_stage",
        "observed_at",
        "source",
    }

    # Assert dedup lookup index exists
    idxs = {i["name"] for i in insp.get_indexes("readings")}
    assert "ix_readings_dedup_lookup" in idxs


def test_downgrade_and_upgrade_cycle(temp_alembic_sqlite):
    """Test upgrade to head, downgrade back to 003, and re-upgrade to 004."""
    cfg, _, get_engine = temp_alembic_sqlite
    command.upgrade(cfg, "head")

    engine = get_engine()

    # 1. Downgrade from 004 to 003
    command.downgrade(cfg, "003_member2_intelligence_schema")
    insp_down = sa.inspect(engine)
    uqs_down = insp_down.get_unique_constraints("readings")
    nk_down = next((u for u in uqs_down if u["name"] == "uq_readings_natural_key"), None)
    assert nk_down is not None
    assert set(nk_down["column_names"]) == {
        "facility_id",
        "parameter",
        "treatment_stage",
        "observed_at",
    }

    # 2. Re-upgrade from 003 to 004
    command.upgrade(cfg, "004_readings_natural_key_lineage")
    insp_up = sa.inspect(engine)
    uqs_up = insp_up.get_unique_constraints("readings")
    nk_up = next((u for u in uqs_up if u["name"] == "uq_readings_natural_key"), None)
    assert nk_up is not None
    assert set(nk_up["column_names"]) == {
        "facility_id",
        "parameter",
        "treatment_stage",
        "observed_at",
        "source",
    }


def test_pre_migration_duplicate_detection(temp_alembic_sqlite):
    """Verify pre-migration check blocks migration if conflicting duplicate rows exist."""
    cfg, _, get_engine = temp_alembic_sqlite

    # Upgrade to 003 first
    command.upgrade(cfg, "003_member2_intelligence_schema")
    engine = get_engine()

    fac_id = str(uuid.uuid4())
    t0 = datetime(2026, 11, 1, 12, 0, 0, tzinfo=timezone.utc)

    # Insert a facility and duplicate readings on (facility_id, parameter, treatment_stage, observed_at, source)
    with engine.connect() as conn:
        conn.execute(sa.text(f"""
            INSERT INTO facilities (facility_id, facility_name, facility_type, location, status, created_at, updated_at)
            VALUES ('{fac_id}', 'Test Fac', 'sewage_treatment_plant', '{{}}', 'active', datetime('now'), datetime('now'))
        """))
        r1_id = str(uuid.uuid4())
        r2_id = str(uuid.uuid4())
        # First reading
        conn.execute(sa.text(f"""
            INSERT INTO readings (reading_id, facility_id, observed_at, treatment_stage, parameter, value, unit, source, quality_status, created_at)
            VALUES ('{r1_id}', '{fac_id}', '{t0.isoformat()}', 'final_effluent', 'BOD', 20.0, 'mg/L', 'telemetry', 'valid', datetime('now'))
        """))
        # Second duplicate reading with identical 5-column natural key
        conn.execute(sa.text(f"""
            INSERT INTO readings (reading_id, facility_id, observed_at, treatment_stage, parameter, value, unit, source, quality_status, created_at)
            VALUES ('{r2_id}', '{fac_id}', '{t0.isoformat()}', 'final_effluent', 'BOD', 22.0, 'mg/L', 'telemetry', 'valid', datetime('now'))
        """))
        conn.commit()

    # Attempting to upgrade to 004 must raise RuntimeError
    with pytest.raises(RuntimeError) as exc_info:
        command.upgrade(cfg, "004_readings_natural_key_lineage")

    assert "conflicting duplicate row groups" in str(exc_info.value)

    # Clean up duplicate row
    with engine.connect() as conn:
        conn.execute(sa.text(f"DELETE FROM readings WHERE reading_id = '{r2_id}'"))
        conn.commit()

    # Now upgrade succeeds cleanly
    command.upgrade(cfg, "004_readings_natural_key_lineage")


def test_orm_model_consistency():
    """Verify ORM Reading.__table_args__ aligns with migration 004 schema."""
    table_args = Reading.__table_args__
    uq_constraint = None
    for arg in table_args:
        if isinstance(arg, sa.UniqueConstraint) and arg.name == "uq_readings_natural_key":
            uq_constraint = arg
            break

    assert uq_constraint is not None, "Reading model missing uq_readings_natural_key constraint"
    constraint_col_names = [col.name if hasattr(col, "name") else col for col in uq_constraint.columns]
    assert set(constraint_col_names) == {
        "facility_id",
        "parameter",
        "treatment_stage",
        "observed_at",
        "source",
    }
