"""004_readings_natural_key_lineage

Alembic migration for natural-key constraint update on readings:
1. Validates and detects any conflicting duplicate records before migration.
2. Migrates uq_readings_natural_key to include the 'source' column
   (facility_id, parameter, treatment_stage, observed_at, source)
   to support append-only correction lineage without timestamp distortion.
3. Ensures index ix_readings_dedup_lookup exists for rapid natural-key queries.
4. Supports complete, symmetrical downgrade restoring 4-column natural key.

Revision ID: 004_readings_natural_key_lineage
Revises: 003_member2_intelligence_schema
Create Date: 2026-11-19 22:50:00.000000 UTC
"""

from typing import Sequence, Union
from alembic import op, context
import sqlalchemy as sa


revision: str = '004_readings_natural_key_lineage'
down_revision: Union[str, None] = '003_member2_intelligence_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_CONSTRAINT_COLS = ["facility_id", "parameter", "treatment_stage", "observed_at"]
NEW_CONSTRAINT_COLS = ["facility_id", "parameter", "treatment_stage", "observed_at", "source"]
CONSTRAINT_NAME = "uq_readings_natural_key"
DEDUP_INDEX_NAME = "ix_readings_dedup_lookup"


def _inspect_readings(conn):
    insp = sa.inspect(conn)
    tables = insp.get_table_names()
    if "readings" not in tables:
        return None, None
    existing_uqs = insp.get_unique_constraints("readings")
    existing_idxs = insp.get_indexes("readings")
    return existing_uqs, existing_idxs


def upgrade() -> None:
    if context.is_offline_mode():
        with op.batch_alter_table("readings") as batch_op:
            batch_op.drop_constraint(CONSTRAINT_NAME, type_="unique")
            batch_op.create_unique_constraint(CONSTRAINT_NAME, NEW_CONSTRAINT_COLS)
            batch_op.drop_index(DEDUP_INDEX_NAME)
            batch_op.create_index(DEDUP_INDEX_NAME, NEW_CONSTRAINT_COLS)
        return

    conn = op.get_bind()
    existing_uqs, existing_idxs = _inspect_readings(conn)
    if existing_uqs is None:
        return  # readings table not present

    # 1. Pre-migration integrity check: detect conflicting duplicates
    dup_query = sa.text("""
        SELECT facility_id, parameter, treatment_stage, observed_at, source, COUNT(*) AS dup_cnt
        FROM readings
        GROUP BY facility_id, parameter, treatment_stage, observed_at, source
        HAVING COUNT(*) > 1
    """)
    duplicate_rows = conn.execute(dup_query).fetchall()
    if duplicate_rows:
        raise RuntimeError(
            f"Pre-migration check failed: detected {len(duplicate_rows)} conflicting duplicate row groups "
            f"in table 'readings' matching natural key {NEW_CONSTRAINT_COLS}. "
            f"Deduplicate records prior to applying migration 004 to preserve data integrity."
        )

    # 2. Inspect active constraint definition
    active_uq = next((uq for uq in existing_uqs if uq.get("name") == CONSTRAINT_NAME), None)
    active_cols = active_uq.get("column_names") if active_uq else []
    already_migrated = set(active_cols) == set(NEW_CONSTRAINT_COLS)

    active_idx_names = {idx.get("name") for idx in (existing_idxs or [])}

    # 3. Apply schema transition using batch operations (portable across PostgreSQL and SQLite)
    with op.batch_alter_table("readings") as batch_op:
        if active_uq and not already_migrated:
            batch_op.drop_constraint(CONSTRAINT_NAME, type_="unique")

        if not already_migrated:
            batch_op.create_unique_constraint(CONSTRAINT_NAME, NEW_CONSTRAINT_COLS)

        if DEDUP_INDEX_NAME not in active_idx_names:
            batch_op.create_index(DEDUP_INDEX_NAME, OLD_CONSTRAINT_COLS)


def downgrade() -> None:
    if context.is_offline_mode():
        with op.batch_alter_table("readings") as batch_op:
            batch_op.drop_index(DEDUP_INDEX_NAME)
            batch_op.drop_constraint(CONSTRAINT_NAME, type_="unique")
            batch_op.create_unique_constraint(CONSTRAINT_NAME, OLD_CONSTRAINT_COLS)
        return

    conn = op.get_bind()
    existing_uqs, existing_idxs = _inspect_readings(conn)
    if existing_uqs is None:
        return

    # Check for potential duplicates that would violate the 4-column constraint on downgrade
    dup_query = sa.text("""
        SELECT facility_id, parameter, treatment_stage, observed_at, COUNT(*) AS dup_cnt
        FROM readings
        GROUP BY facility_id, parameter, treatment_stage, observed_at
        HAVING COUNT(*) > 1
    """)
    downgrade_dups = conn.execute(dup_query).fetchall()
    if downgrade_dups:
        raise RuntimeError(
            f"Downgrade precondition failed: {len(downgrade_dups)} multi-source readings share the same "
            f"(facility_id, parameter, treatment_stage, observed_at). Downgrading to 4-column constraint "
            f"would cause data loss or uniqueness violations."
        )

    active_idx_names = {idx.get("name") for idx in (existing_idxs or [])}

    with op.batch_alter_table("readings") as batch_op:
        if DEDUP_INDEX_NAME in active_idx_names:
            batch_op.drop_index(DEDUP_INDEX_NAME)

        active_uq = next((uq for uq in existing_uqs if uq.get("name") == CONSTRAINT_NAME), None)
        if active_uq:
            batch_op.drop_constraint(CONSTRAINT_NAME, type_="unique")

        batch_op.create_unique_constraint(CONSTRAINT_NAME, OLD_CONSTRAINT_COLS)
