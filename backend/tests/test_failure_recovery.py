"""AquaTrust AI — Failure Recovery & Resilience Test Suite.

Tests for:
- M2-26: Failure Recovery & Edge Case Testing
- Transaction rollback on mid-operation database exception
- DLT Gateway offline/fallback behavior
- Stream cache hydration recovery
"""

import pytest
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from uuid import uuid4
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db.session import get_db, engine
from app.models import Base
from app.models.facility import Facility
from app.models.reading import Reading
from app.models.treatment_record import TreatmentRecord
from app.services.treatment_service import TreatmentService
from app.dlt.gateway import FabricDLTGateway
from app.core.security import get_current_user_claims


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    with Session(engine) as session:
        yield session


@pytest.fixture
def client(db_session: Session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user_claims] = lambda: {"sub": "recovery_tester", "role": "admin", "facility_id": "FAC-REC-001"}
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_dlt_gateway_simulation_fallback_mode():
    """Verify DLT gateway functions deterministically in simulation/fallback mode."""
    gateway = FabricDLTGateway(mode="simulation")
    rec_id = uuid4()
    fac_id = uuid4()
    rec_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    res = gateway.anchor_record(
        record_id=rec_id,
        record_hash=rec_hash,
        facility_id=fac_id,
        compliance_status="compliant",
        signature_value="sig_val",
        key_id="key-01",
    )
    assert res["status"] == "anchored"
    assert res["tx_id"] is None
    assert res["simulation_reference"].startswith("sim:")
    assert res["simulation_sequence"] > 0
    assert res["distributed_ledger"] is False

    # Query transaction
    queried = gateway.query_transaction(res["simulation_reference"])
    assert queried is not None
    assert queried["record_hash"] == rec_hash


def test_db_transaction_rollback_preserves_state(db_session: Session):
    """Verify transactional integrity when an exception occurs midway."""
    fac = Facility(
        facility_id=uuid4(),
        facility_name="Test STP",
        facility_type="municipal_stp",
        location={},
        status="active",
    )
    db_session.add(fac)
    db_session.commit()

    # Attempt invalid operation in nested transaction
    try:
        with db_session.begin_nested():
            r1 = Reading(
                reading_id=uuid4(),
                facility_id=fac.facility_id,
                observed_at=datetime.now(timezone.utc),
                treatment_stage="final_effluent",
                parameter="BOD",
                value=Decimal("20.0"),
                unit="mg/L",
                quality_status="valid",
            )
            db_session.add(r1)
            # Raise artificial error
            raise RuntimeError("Database connection glitch during transaction")
    except RuntimeError:
        pass

    # Ensure r1 was rolled back and facility remains clean
    count = db_session.query(Reading).count()
    assert count == 0
    assert db_session.query(Facility).count() == 1
