"""AquaTrust AI — Generic Base Repository.

Provides standard CRUD and pagination abstractions for SQLAlchemy 2.0 ORM models.
"""

from typing import Generic, TypeVar, Type, Optional, List, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Generic repository encapsulating database query and persistence logic."""

    def __init__(self, db: Session, model: Type[ModelType]):
        self.db = db
        self.model = model

    def get(self, id: Any) -> Optional[ModelType]:
        """Fetch entity by primary key."""
        return self.db.get(self.model, id)

    def list(self, skip: int = 0, limit: int = 100, **filters) -> List[ModelType]:
        """List entities with optional attribute filtering and pagination."""
        stmt = select(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key) and value is not None:
                stmt = stmt.where(getattr(self.model, key) == value)
        stmt = stmt.offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count(self, **filters) -> int:
        """Count entities matching optional filters."""
        stmt = select(func.count()).select_from(self.model)
        for key, value in filters.items():
            if hasattr(self.model, key) and value is not None:
                stmt = stmt.where(getattr(self.model, key) == value)
        return self.db.scalar(stmt) or 0

    def create(self, entity: ModelType) -> ModelType:
        """Persist a new entity and flush."""
        self.db.add(entity)
        self.db.flush()
        return entity

    def update(self, entity: ModelType) -> ModelType:
        """Merge/update an entity and flush."""
        merged = self.db.merge(entity)
        self.db.flush()
        return merged

    def delete(self, id: Any) -> bool:
        """Delete an entity by primary key."""
        entity = self.get(id)
        if entity:
            self.db.delete(entity)
            self.db.flush()
            return True
        return False
