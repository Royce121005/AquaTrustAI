"""AquaTrust AI — User & Authentication Repository."""

from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository handling user entity management, authentication, and RBAC lookup."""

    def __init__(self, db: Session):
        super().__init__(db, User)

    def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Fetch user by UUID."""
        return self.get(user_id)

    def get_by_username(self, username: str) -> Optional[User]:
        """Fetch user by unique username."""
        stmt = select(User).where(User.username == username)
        return self.db.scalars(stmt).first()

    def get_by_email(self, email: str) -> Optional[User]:
        """Fetch user by email."""
        stmt = select(User).where(User.email == email)
        return self.db.scalars(stmt).first()

    def create_user(self, user: User) -> User:
        """Create a new system user."""
        return self.create(user)
