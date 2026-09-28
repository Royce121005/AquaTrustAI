"""AquaTrust AI — Environmental Compliance Router."""

from typing import List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, desc

from app.db.session import get_db
from app.models.compliance_rule import ComplianceRule
from app.models.compliance_result import ComplianceResult
from app.models.treatment_record import TreatmentRecord
from app.repositories.treatment_repository import TreatmentRepository
from app.services.compliance_service import ComplianceService
from app.schemas.compliance import (
    ComplianceRuleResponse,
    ComplianceEvaluateRequest,
    ComplianceEvaluateResponse,
    ComplianceSummaryResponse,
)

router = APIRouter(tags=["Environmental Compliance"])


@router.get(
    "/compliance/rules",
    response_model=List[ComplianceRuleResponse],
    summary="List active environmental compliance rules",
)
def get_compliance_rules(db: Session = Depends(get_db)):
    """List active CPCB / EPA discharge standard rules."""
    rules = ComplianceService.ensure_default_rules(db)
    return [
        ComplianceRuleResponse(
            rule_id=r.rule_id,
            parameter=r.parameter,
            operator=r.operator,
            threshold=r.threshold,
            threshold_min=r.threshold_min,
            threshold_max=r.threshold_max,
            threshold_unit=r.threshold_unit,
            stage_scope=r.stage_scope,
            rule_version=r.rule_version,
            source_reference=r.source_reference,
            active=r.active,
        )
        for r in rules
    ]


@router.post(
    "/compliance/evaluate",
    response_model=ComplianceEvaluateResponse,
    summary="Evaluate environmental compliance for a treatment record",
)
def evaluate_compliance(payload: ComplianceEvaluateRequest, db: Session = Depends(get_db)):
    """Evaluate compliance for a treatment record."""
    if not payload.treatment_record_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="treatment_record_id is required",
        )

    treatment_repo = TreatmentRepository(db)
    record = treatment_repo.get_by_id(payload.treatment_record_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Treatment record {payload.treatment_record_id} not found")

    comp_res = ComplianceService.evaluate_treatment_record(db, record)
    db.commit()
    db.refresh(comp_res)

    return ComplianceEvaluateResponse(
        compliance_result_id=comp_res.compliance_result_id,
        treatment_record_id=comp_res.treatment_record_id,
        compliance_status=comp_res.compliance_status,
        rule_version=comp_res.rule_version,
        parameter_results=comp_res.parameter_results,
        evaluated_at=comp_res.evaluated_at,
    )


@router.get(
    "/compliance/summary",
    response_model=ComplianceSummaryResponse,
    summary="Get environmental compliance summary metrics",
)
def get_compliance_summary(db: Session = Depends(get_db)):
    """Compliance summary supporting frontend compliance.js."""
    total = db.scalar(select(func.count()).select_from(ComplianceResult)) or 0
    compliant = db.scalar(select(func.count()).select_from(ComplianceResult).where(ComplianceResult.compliance_status == "compliant")) or 0
    non_compliant = db.scalar(select(func.count()).select_from(ComplianceResult).where(ComplianceResult.compliance_status == "non_compliant")) or 0
    rate = (float(compliant) / float(total) * 100.0) if total > 0 else 100.0

    recent_stmt = select(ComplianceResult).order_by(desc(ComplianceResult.evaluated_at)).limit(10)
    recent_rows = list(db.scalars(recent_stmt).all())
    events = [
        {
            "compliance_result_id": str(r.compliance_result_id),
            "treatment_record_id": str(r.treatment_record_id),
            "compliance_status": r.compliance_status,
            "parameter_results": r.parameter_results,
            "evaluated_at": r.evaluated_at.isoformat(),
        }
        for r in recent_rows
    ]

    return ComplianceSummaryResponse(
        total_evaluations=total,
        compliant_count=compliant,
        non_compliant_count=non_compliant,
        compliance_rate_percent=round(rate, 2),
        cpcb_standard_version="CPCB_2021",
        recent_evaluations=events,
    )
