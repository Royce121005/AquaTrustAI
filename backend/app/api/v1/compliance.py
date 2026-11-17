"""AquaTrust AI — Environmental Compliance Router."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Dict, Any
from uuid import UUID, uuid4
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
from app.core.security import get_current_user_claims, require_role

router = APIRouter(tags=["Environmental Compliance"])


@router.get(
    "/compliance/rules",
    response_model=List[ComplianceRuleResponse],
    summary="List active environmental compliance rules",
    dependencies=[Depends(get_current_user_claims)],
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
    dependencies=[Depends(require_role(["operator", "auditor", "regulatory_stakeholder", "admin"]))],
)
def evaluate_compliance(payload: ComplianceEvaluateRequest, db: Session = Depends(get_db)):
    """Evaluate compliance for a treatment record or ad-hoc parameters."""
    if payload.parameters:
        rules = db.query(ComplianceRule).filter(ComplianceRule.active == True).all()
        param_results = {}
        all_compliant = True

        for p_name, p_val in payload.parameters.items():
            norm_name = p_name.upper()
            rule = next((r for r in rules if r.parameter.upper() == norm_name), None)
            if not rule:
                continue

            val = Decimal(str(p_val))
            op = (rule.operator or "").strip().lower()
            is_comp = True

            if op in ("lte", "<=") and rule.threshold is not None:
                is_comp = (val <= rule.threshold)
            elif op in ("between", "range") and rule.threshold_min is not None and rule.threshold_max is not None:
                is_comp = (rule.threshold_min <= val <= rule.threshold_max)

            if not is_comp:
                all_compliant = False

            param_results[norm_name] = {
                "observed_value": float(val),
                "threshold": float(rule.threshold) if rule.threshold is not None else None,
                "status": "compliant" if is_comp else "non_compliant",
            }

        verdict = "compliant" if all_compliant else "non_compliant"
        return ComplianceEvaluateResponse(
            compliance_result_id=uuid4(),
            treatment_record_id=payload.treatment_record_id,
            compliance_status=verdict,
            overall_status=verdict,
            rule_version="CPCB_2021",
            parameter_results=param_results,
            evaluated_at=datetime.now(timezone.utc),
        )

    if not payload.treatment_record_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either treatment_record_id or parameters dictionary is required",
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
        overall_status=comp_res.compliance_status,
        rule_version=comp_res.rule_version,
        parameter_results=comp_res.parameter_results,
        evaluated_at=comp_res.evaluated_at,
    )


@router.get(
    "/compliance/summary",
    response_model=ComplianceSummaryResponse,
    summary="Get environmental compliance summary metrics",
    dependencies=[Depends(get_current_user_claims)],
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

