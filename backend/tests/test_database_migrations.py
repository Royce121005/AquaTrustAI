"""AquaTrust AI — Database Migrations Verification Test.

Verifies Alembic configuration, migration version chain, and offline DDL generation.
"""

import os
import subprocess
import sys
from alembic.config import Config
from alembic.script import ScriptDirectory


def test_alembic_configuration_and_revisions():
    """Verify that Alembic configuration and revision chain are valid and unambiguous."""
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    alembic_ini_path = os.path.join(backend_dir, "alembic.ini")
    assert os.path.exists(alembic_ini_path), f"Missing alembic.ini at {alembic_ini_path}"

    alembic_cfg = Config(alembic_ini_path)
    script_dir = ScriptDirectory.from_config(alembic_cfg)
    heads = script_dir.get_heads()
    assert len(heads) == 1, f"Expected exactly 1 head revision, got {heads}"
    assert heads[0] == "001_initial_schema"


def test_alembic_offline_sql_generation():
    """Verify that Alembic can generate offline PostgreSQL DDL SQL without error."""
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    env = dict(os.environ)
    env["DATABASE_URL"] = "postgresql://aquatrust_user:aquatrust_password@localhost:5432/aquatrust_db"
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "-c", "alembic.ini", "upgrade", "head", "--sql"],
        cwd=backend_dir,
        capture_output=True,
        text=True,
        env=env,
    )
    assert result.returncode == 0, f"Alembic SQL generation failed: {result.stderr}"
    assert "CREATE TABLE facilities" in result.stdout
    assert "CREATE TABLE treatment_records" in result.stdout
    assert "CREATE TABLE certificates" in result.stdout
    assert "CREATE TABLE cryptographic_artifacts" in result.stdout
    assert "CREATE TABLE dlt_anchors" in result.stdout
