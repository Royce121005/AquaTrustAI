"""AquaTrust AI — Repository Dependency Injection Providers."""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.facility_repository import FacilityRepository
from app.repositories.reading_repository import ReadingRepository
from app.repositories.treatment_repository import TreatmentRepository
from app.repositories.user_repository import UserRepository
from app.repositories.audit_repository import AuditLogRepository
from app.repositories.experiment_repository import ExperimentRepository


def get_facility_repository(db: Session = Depends(get_db)) -> FacilityRepository:
    return FacilityRepository(db)


def get_reading_repository(db: Session = Depends(get_db)) -> ReadingRepository:
    return ReadingRepository(db)


def get_treatment_repository(db: Session = Depends(get_db)) -> TreatmentRepository:
    return TreatmentRepository(db)


def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_audit_repository(db: Session = Depends(get_db)) -> AuditLogRepository:
    return AuditLogRepository(db)


def get_experiment_repository(db: Session = Depends(get_db)) -> ExperimentRepository:
    return ExperimentRepository(db)
