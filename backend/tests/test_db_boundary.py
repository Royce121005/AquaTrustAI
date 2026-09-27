"""Tests for database session and persistence boundary lifecycle."""

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import check_db_connection, get_db


def test_db_session_lifecycle(db_session: Session):
    """Verify session instantiation and attribute configuration."""
    assert db_session is not None
    assert isinstance(db_session, Session)


def test_get_db_generator():
    """Verify get_db dependency provider yields and closes session."""
    gen = get_db()
    session = next(gen)
    assert isinstance(session, Session)
    # Ensure closing without error
    with pytest.raises(StopIteration):
        next(gen)


def test_check_db_connection_returns_bool():
    """Verify check_db_connection returns boolean connectivity status."""
    status_result = check_db_connection()
    assert isinstance(status_result, bool)
