"""AquaTrust AI — Environmental Compliance Verification Service.

Evaluates treated effluent water quality observations against authoritative
CPCB (Central Pollution Control Board, India) / EPA regulatory discharge standards.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Tuple, List, Dict, Any, Optional
from uuid import uuid4, UUID
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.base import utc_now
from app.models.compliance_rule import ComplianceRule
from app.models.compliance_result import ComplianceResult
from app.models.treatment_record import TreatmentRecord
from app.models.reading import Reading
from app.repositories.treatment_repository import TreatmentRepository
from app.repositories.reading_repository import ReadingRepository

# Authoritative CPCB 2021 Discharge Standards for Sewage Treatment Plants
DEFAULT_CPCB_RULES = [
    {
        "parameter": "BOD",
        "operator": "<=",
        "threshold": Decimal("30.000000"),
        "threshold_unit": "mg/L",
        "stage_scope": "final_effluent",
        "source_reference": "CPCB_2021",
    },
    {
        "parameter": "COD",
        "operator": "<=",
        "threshold": Decimal("250.000000"),
        "threshold_unit": "mg/L",
        "stage_scope": "final_effluent",
        "source_reference": "CPCB_2021",
    },
    {
        "parameter": "TSS",
        "operator": "<=",
        "threshold": Decimal("50.000000"),
        "threshold_unit": "mg/L",
        "stage_scope": "final_effluent",
        "source_reference": "CPCB_2021",
    },
    {
        "parameter": "PH",
        "operator": "BETWEEN",
        "threshold_min": Decimal("5.500000"),
        "threshold_max": Decimal("9.000000"),
        "threshold_unit": "pH units",
        "stage_scope": "final_effluent",
        "source_reference": "CPCB_2021",
    },
    {
        "parameter": "NH4_N",
        "operator": "<=",
        "threshold": Decimal("50.000000"),
        "threshold_unit": "mg/L",
        "stage_scope": "final_effluent",
        "source_reference": "CPCB_2021",
    },
]


class ComplianceService:
    """Service evaluating environmental compliance rules and persisting audit outcomes."""

    RULE_VERSION = "1.0.0"

    @classmethod
    def ensure_default_rules(cls, db: Session) -> List[ComplianceRule]:
        """Seed default CPCB rules if not present in the database."""
        treatment_repo = TreatmentRepository(db)
        existing = treatment_repo.get_active_compliance_rules(stage="final_effluent")
        if existing:
            return existing

        created_rules = []
        for r_spec in DEFAULT_CPCB_RULES:
            rule = ComplianceRule(
                rule_id=uuid4(),
                parameter=r_spec["parameter"],
                operator=r_spec["operator"],
                threshold=r_spec.get("threshold"),
                threshold_min=r_spec.get("threshold_min"),
                threshold_max=r_spec.get("threshold_max"),
                threshold_unit=r_spec["threshold_unit"],
                stage_scope=r_spec["stage_scope"],
                rule_version=cls.RULE_VERSION,
                source_reference=r_spec["source_reference"],
                active=True,
                created_at=utc_now(),
            )
            db.add(rule)
            created_rules.append(rule)
        db.flush()
        return created_rules

    @classmethod
    def evaluate_readings(
        cls,
        readings: List[Reading],
        rules: Optional[List[ComplianceRule]] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        """Evaluate a list of readings against compliance rules.

        Returns:
            Tuple of (overall_compliance_status, parameter_results_dict)
        """
        # Aggregate readings by parameter
        param_values: Dict[str, List[Decimal]] = {}
        for r in readings:
            if r.value is not None:
                p = r.parameter.upper()
                if p not in param_values:
                    param_values[p] = []
                param_values[p].append(Decimal(str(r.value)))

        if not param_values:
            return "not_applicable", {}

        active_rules = rules or []
        param_results: Dict[str, Any] = {}
        has_non_compliant = False

        for rule in active_rules:
            p = rule.parameter.upper()
            if p in param_values:
                vals = param_values[p]
                mean_val = sum(vals) / Decimal(len(vals))
                max_val = max(vals)
                min_val = min(vals)

                is_compliant = True
                if rule.operator == "<=" and rule.threshold is not None:
                    is_compliant = (mean_val <= rule.threshold)
                elif rule.operator == ">=" and rule.threshold is not None:
                    is_compliant = (mean_val >= rule.threshold)
                elif rule.operator == "BETWEEN" and rule.threshold_min is not None and rule.threshold_max is not None:
                    is_compliant = (rule.threshold_min <= mean_val <= rule.threshold_max)

                if not is_compliant:
                    has_non_compliant = True

                param_results[p] = {
                    "status": "compliant" if is_compliant else "non_compliant",
                    "mean_value": float(mean_val),
                    "max_value": float(max_val),
                    "min_value": float(min_val),
                    "sample_count": len(vals),
                    "operator": rule.operator,
                    "threshold": float(rule.threshold) if rule.threshold is not None else None,
                    "threshold_min": float(rule.threshold_min) if rule.threshold_min is not None else None,
                    "threshold_max": float(rule.threshold_max) if rule.threshold_max is not None else None,
                    "unit": rule.threshold_unit,
                }

        overall_status = "non_compliant" if has_non_compliant else "compliant"
        return overall_status, param_results

    @classmethod
    def evaluate_treatment_record(cls, db: Session, record: TreatmentRecord) -> ComplianceResult:
        """Evaluate compliance for a treatment record and persist the result."""
        rules = cls.ensure_default_rules(db)
        reading_repo = ReadingRepository(db)
        treatment_repo = TreatmentRepository(db)

        # Get readings in window
        readings = reading_repo.get_readings(
            facility_id=record.facility_id,
            start_time=record.period_start,
            end_time=record.period_end,
            limit=1000,
        )

        overall_status, param_results = cls.evaluate_readings(readings, rules)

        # Update record compliance status
        record.compliance_status = overall_status

        # Create or update ComplianceResult
        existing = treatment_repo.get_compliance_result(record.record_id)
        if existing:
            existing.compliance_status = overall_status
            existing.parameter_results = param_results
            existing.evaluated_at = utc_now()
            db.flush()
            return existing

        comp_res = ComplianceResult(
            compliance_result_id=uuid4(),
            treatment_record_id=record.record_id,
            compliance_status=overall_status,
            rule_version=cls.RULE_VERSION,
            parameter_results=param_results,
            evaluated_at=utc_now(),
        )
        treatment_repo.add_compliance_result(comp_res)
        db.flush()
        return comp_res
