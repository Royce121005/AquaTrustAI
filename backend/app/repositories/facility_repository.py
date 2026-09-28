"""AquaTrust AI — Facility Repository."""

from typing import Optional, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.facility import Facility
from app.models.sensor import Sensor
from app.repositories.base import BaseRepository


class FacilityRepository(BaseRepository[Facility]):
    """Repository handling facility and sensor persistence operations."""

    def __init__(self, db: Session):
        super().__init__(db, Facility)

    def get_by_id(self, facility_id: UUID) -> Optional[Facility]:
        """Fetch facility by UUID."""
        return self.get(facility_id)

    def get_by_name(self, facility_name: str) -> Optional[Facility]:
        """Fetch facility by name."""
        stmt = select(Facility).where(Facility.facility_name == facility_name)
        return self.db.scalars(stmt).first()

    def get_active_facilities(self) -> List[Facility]:
        """List all active facilities."""
        stmt = select(Facility).where(Facility.status == "active")
        return list(self.db.scalars(stmt).all())

    def get_sensors(self, facility_id: UUID) -> List[Sensor]:
        """List all sensors registered under a facility."""
        stmt = select(Sensor).where(Sensor.facility_id == facility_id)
        return list(self.db.scalars(stmt).all())

    def get_sensor(self, sensor_id: UUID) -> Optional[Sensor]:
        """Fetch sensor by UUID."""
        return self.db.get(Sensor, sensor_id)

    def add_sensor(self, sensor: Sensor) -> Sensor:
        """Register a new sensor."""
        self.db.add(sensor)
        self.db.flush()
        return sensor
