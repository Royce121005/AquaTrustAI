"""AquaTrust AI — Sustainability & Resource Optimization Router (Member 2 Phase 5)."""

from typing import Dict, Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import require_role
from app.schemas.sustainability import (
    FacilityOptimizationResponse,
    SustainabilitySummaryResponse,
)
from app.services.sustainability_service import SustainabilityService

router = APIRouter(prefix="/sustainability", tags=["Sustainability & Circularity Optimization"])


@router.get(
    "/summary",
    response_model=SustainabilitySummaryResponse,
    summary="Get network-wide or facility-specific sustainability & circularity credentials",
    dependencies=[Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"]))],
)
def get_sustainability_summary(
    facility_id: Optional[UUID] = Query(None, description="Optional facility filter"),
    db: Session = Depends(get_db),
):
    """
    Computes aggregated water treated, freshwater displaced, chemical waste prevented,
    specific energy consumption (kWh/m3), and greenhouse gas carbon avoided (kg CO2e).
    """
    service = SustainabilityService(db)
    return service.get_sustainability_summary(facility_id=facility_id)


@router.get(
    "/facilities/{facility_id}/optimization",
    response_model=FacilityOptimizationResponse,
    summary="Calculate real-time aeration and chemical coagulant optimization for a facility",
    dependencies=[Depends(require_role(["operator", "admin", "auditor", "regulatory_stakeholder"]))],
)
def get_facility_optimization(
    facility_id: UUID,
    flow_rate_override: Optional[float] = Query(None, description="Optional flow rate override in m3/day"),
    reuse_rate_override: Optional[float] = Query(None, description="Optional treated water reuse rate in m3/day"),
    db: Session = Depends(get_db),
):
    """
    Applies Metcalf & Eddy stoichiometric aeration power optimization (kW) and empirical coagulant
    dosing curves (mg/L & L/hr) to calculate financial savings and verifiable ESG metrics.
    """
    service = SustainabilityService(db)
    try:
        return service.get_facility_optimization(
            facility_id=facility_id,
            flow_rate_override=flow_rate_override,
            reuse_rate_override=reuse_rate_override,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
