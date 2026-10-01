"""AquaTrust AI — Environmental Compliance Verification Service.

Evaluates treated effluent water quality observations against authoritative
CPCB (Central Pollution Control Board, India) / EPA regulatory discharge standards.
Hardened according to MASTER/COMPLIANCE_RULE_SPECIFICATION.md (v2.2.1).
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Tuple, List, Dict, Any, Optional, Set
from uuid import uuid4, UUID
from sqlalchemy.orm import Session

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
        "operator": "lte",
        "threshold": Decimal("30.000000"),
        "threshold_unit": "mg/L",
        "stage_scope": "final_effluent",
        "source_reference": "CPCB_2021",
        "effective_from": datetime(2021, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
    },
    {
        "parameter": "COD",
        "operator": "lte",
        "threshold": Decimal("250.000000"),
        "threshold_unit": "mg/L",
        "stage_scope": "final_effluent",
        "source_reference": "CPCB_2021",
        "effective_from": datetime(2021, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
    },
    {
        "parameter": "TSS",
        "operator": "lte",
        "threshold": Decimal("50.000000"),
        "threshold_unit": "mg/L",
        "stage_scope": "final_effluent",
        "source_reference": "CPCB_2021",
        "effective_from": datetime(2021, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
    },
    {
        "parameter": "PH",
        "operator": "between",
        "threshold_min": Decimal("5.500000"),
        "threshold_max": Decimal("9.000000"),
        "threshold_unit": "pH units",
        "stage_scope": "final_effluent",
        "source_reference": "CPCB_2021",
        "effective_from": datetime(2021, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
    },
    {
        "parameter": "NH4_N",
        "operator": "lte",
        "threshold": Decimal("50.000000"),
        "threshold_unit": "mg/L",
        "stage_scope": "final_effluent",
        "source_reference": "CPCB_2021",
        "effective_from": datetime(2021, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
    },
]

# Mandatory parameters required for final effluent discharge compliance
MANDATORY_FINAL_EFFLUENT_PARAMETERS: Set[str] = {"BOD", "COD", "TSS", "PH", "NH4_N"}


def normalize_reading_unit(
    value: Decimal,
    observed_unit: str,
    threshold_unit: str,
) -> Optional[Decimal]:
    """Normalize reading value from observed_unit to rule threshold_unit.

    Supported conversions:
    - mg/L, g/L (* 1000), ppm (* 1.0) -> mg/L
    - g/L (/ 1000) -> mg/L
    - pH units / pH / units -> pH units
    - Case-insensitive string match
    """
    if value is None:
        return None

    obs_u = (observed_unit or "").strip().lower()
    tgt_u = (threshold_unit or "").strip().lower()

    if not obs_u and not tgt_u:
        return value

    if obs_u == tgt_u:
        return value

    # Target: mg/L
    if tgt_u in ("mg/l", "mg/l."):
        if obs_u in ("mg/l", "mg/l.", "mg/dm3", "mg/dm^3"):
            return value
        elif obs_u in ("g/l", "g/l.", "g/dm3"):
            return value * Decimal("1000")
        elif obs_u in ("ppm", "parts per million"):
            return value * Decimal("1.0")
        elif obs_u in ("ug/l", "µg/l", "ppb"):
            return value / Decimal("1000")
        return None

    # Target: g/L
    if tgt_u in ("g/l", "g/l."):
        if obs_u in ("g/l", "g/l."):
            return value
        elif obs_u in ("mg/l", "mg/l."):
            return value / Decimal("1000")
        elif obs_u in ("ppm", "parts per million"):
            return value / Decimal("1000")
        return None

    # Target: pH units
    if tgt_u in ("ph units", "ph", "ph unit", "standard units", "su"):
        if obs_u in ("ph units", "ph", "ph unit", "standard units", "su", "units", ""):
            return value
        return None

    # Target: NTU
    if tgt_u in ("ntu", "jtu", "fnu"):
        if obs_u in ("ntu", "jtu", "fnu"):
            return value
        return None

    return None


class ComplianceService:
    """Service evaluating environmental compliance rules and persisting audit outcomes."""

    RULE_VERSION = "2.2.1"

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
                stage_scope=r_spec.get("stage_scope", "final_effluent"),
                rule_version=cls.RULE_VERSION,
                source_reference=r_spec.get("source_reference", "CPCB_2021"),
                active=True,
                effective_from=r_spec.get("effective_from", datetime(2021, 1, 1, 0, 0, 0, tzinfo=timezone.utc)),
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
        if rules is None:
            rules = [
                ComplianceRule(
                    rule_id=uuid4(),
                    parameter=r_spec["parameter"],
                    operator=r_spec["operator"],
                    threshold=r_spec.get("threshold"),
                    threshold_min=r_spec.get("threshold_min"),
                    threshold_max=r_spec.get("threshold_max"),
                    threshold_unit=r_spec["threshold_unit"],
                    stage_scope=r_spec.get("stage_scope", "final_effluent"),
                    rule_version=cls.RULE_VERSION,
                    source_reference=r_spec.get("source_reference", "CPCB_2021"),
                    active=True,
                    effective_from=r_spec.get("effective_from", datetime(2021, 1, 1, 0, 0, 0, tzinfo=timezone.utc)),
                    created_at=utc_now(),
                )
                for r_spec in DEFAULT_CPCB_RULES
            ]

        if not readings:
            return "pending", {}

        param_results: Dict[str, Any] = {}
        has_non_compliant = False

        for rule in rules:
            p_upper = (rule.parameter or "").strip().upper()
            stage_scope = rule.stage_scope

            # Stage-scope isolation: match rule.stage_scope or None
            stage_readings = [
                r for r in readings
                if stage_scope is None or (r.treatment_stage or "").strip().lower() == stage_scope.strip().lower()
            ]

            # Match parameter
            param_matching_readings = [
                r for r in stage_readings
                if (r.parameter or "").strip().upper() == p_upper
            ]

            if not param_matching_readings:
                continue

            # Quality-status filtering: exclude invalid, suspect, insufficient_data
            valid_readings = [
                r for r in param_matching_readings
                if r.value is not None and (
                    r.quality_status is None
                    or str(r.quality_status).strip().lower() not in ("invalid", "suspect", "insufficient_data")
                )
            ]

            if not valid_readings:
                param_results[p_upper] = {
                    "parameter": rule.parameter,
                    "observed_value": None,
                    "observed_unit": param_matching_readings[0].unit if param_matching_readings else rule.threshold_unit,
                    "normalized_value": None,
                    "rule_id": str(rule.rule_id) if getattr(rule, "rule_id", None) else None,
                    "rule_version": getattr(rule, "rule_version", cls.RULE_VERSION) or cls.RULE_VERSION,
                    "operator": rule.operator,
                    "threshold": float(rule.threshold) if rule.threshold is not None else None,
                    "threshold_min": float(rule.threshold_min) if rule.threshold_min is not None else None,
                    "threshold_max": float(rule.threshold_max) if rule.threshold_max is not None else None,
                    "threshold_unit": rule.threshold_unit,
                    "status": "pending",
                    "result": "pending",
                    "reason": "All matching readings excluded due to quality status (invalid/suspect/insufficient_data)",
                    "sample_count": 0,
                    "min_value": None,
                    "max_value": None,
                    "mean_value": None,
                }
                continue

            # Calculate observed statistics safely
            distinct_obs_units = set(r.unit.strip().lower() for r in valid_readings if r.unit)
            if len(distinct_obs_units) <= 1:
                obs_vals = [Decimal(str(r.value)) for r in valid_readings]
                obs_mean = sum(obs_vals) / Decimal(len(obs_vals))
                obs_min = min(obs_vals)
                obs_max = max(obs_vals)
                obs_unit = valid_readings[0].unit or rule.threshold_unit
            else:
                # Mixed units present: avoid raw arithmetic sum distortion across differing units
                obs_mean = None
                obs_min = None
                obs_max = None
                obs_unit = "mixed (" + ", ".join(sorted(distinct_obs_units)) + ")"

            # Normalize values
            norm_vals = []
            unit_norm_error = False
            for r in valid_readings:
                nv = normalize_reading_unit(Decimal(str(r.value)), r.unit, rule.threshold_unit)
                if nv is None:
                    unit_norm_error = True
                    break
                norm_vals.append(nv)

            if unit_norm_error or not norm_vals:
                param_results[p_upper] = {
                    "parameter": rule.parameter,
                    "observed_value": float(obs_mean) if obs_mean is not None else None,
                    "observed_unit": obs_unit,
                    "normalized_value": None,
                    "rule_id": str(rule.rule_id) if getattr(rule, "rule_id", None) else None,
                    "rule_version": getattr(rule, "rule_version", cls.RULE_VERSION) or cls.RULE_VERSION,
                    "operator": rule.operator,
                    "threshold": float(rule.threshold) if rule.threshold is not None else None,
                    "threshold_min": float(rule.threshold_min) if rule.threshold_min is not None else None,
                    "threshold_max": float(rule.threshold_max) if rule.threshold_max is not None else None,
                    "threshold_unit": rule.threshold_unit,
                    "status": "not_applicable",
                    "result": "not_applicable",
                    "reason": f"Observed unit '{obs_unit}' cannot be normalized to rule threshold unit '{rule.threshold_unit}'",
                    "sample_count": len(valid_readings),
                    "min_value": float(obs_min) if obs_min is not None else None,
                    "max_value": float(obs_max) if obs_max is not None else None,
                    "mean_value": float(obs_mean) if obs_mean is not None else None,
                }
                continue

            norm_mean = sum(norm_vals) / Decimal(len(norm_vals))
            norm_min = min(norm_vals)
            norm_max = max(norm_vals)

            op = (rule.operator or "").strip().lower()
            is_compliant = False
            reason = ""

            if op in ("lte", "<="):
                if rule.threshold is not None:
                    is_compliant = (norm_mean <= rule.threshold)
                    reason = (
                        f"Mean value {float(norm_mean):.2f} {rule.threshold_unit} satisfies <= {float(rule.threshold):.2f} {rule.threshold_unit} limit"
                        if is_compliant else
                        f"Mean value {float(norm_mean):.2f} {rule.threshold_unit} exceeds <= {float(rule.threshold):.2f} {rule.threshold_unit} limit"
                    )
                else:
                    reason = "Rule threshold is missing"
            elif op in ("lt", "<"):
                if rule.threshold is not None:
                    is_compliant = (norm_mean < rule.threshold)
                    reason = (
                        f"Mean value {float(norm_mean):.2f} {rule.threshold_unit} satisfies < {float(rule.threshold):.2f} {rule.threshold_unit} limit"
                        if is_compliant else
                        f"Mean value {float(norm_mean):.2f} {rule.threshold_unit} violates < {float(rule.threshold):.2f} {rule.threshold_unit} limit"
                    )
                else:
                    reason = "Rule threshold is missing"
            elif op in ("gte", ">="):
                if rule.threshold is not None:
                    is_compliant = (norm_mean >= rule.threshold)
                    reason = (
                        f"Mean value {float(norm_mean):.2f} {rule.threshold_unit} satisfies >= {float(rule.threshold):.2f} {rule.threshold_unit} limit"
                        if is_compliant else
                        f"Mean value {float(norm_mean):.2f} {rule.threshold_unit} falls below >= {float(rule.threshold):.2f} {rule.threshold_unit} limit"
                    )
                else:
                    reason = "Rule threshold is missing"
            elif op in ("gt", ">"):
                if rule.threshold is not None:
                    is_compliant = (norm_mean > rule.threshold)
                    reason = (
                        f"Mean value {float(norm_mean):.2f} {rule.threshold_unit} satisfies > {float(rule.threshold):.2f} {rule.threshold_unit} limit"
                        if is_compliant else
                        f"Mean value {float(norm_mean):.2f} {rule.threshold_unit} falls below > {float(rule.threshold):.2f} {rule.threshold_unit} limit"
                    )
                else:
                    reason = "Rule threshold is missing"
            elif op in ("eq", "==", "="):
                if rule.threshold is not None:
                    is_compliant = (norm_mean == rule.threshold)
                    reason = (
                        f"Mean value {float(norm_mean):.2f} {rule.threshold_unit} equals {float(rule.threshold):.2f} {rule.threshold_unit}"
                        if is_compliant else
                        f"Mean value {float(norm_mean):.2f} {rule.threshold_unit} does not equal {float(rule.threshold):.2f} {rule.threshold_unit}"
                    )
                else:
                    reason = "Rule threshold is missing"
            elif op in ("between",):
                if rule.threshold_min is not None and rule.threshold_max is not None:
                    # Instantaneous boundary check: all observations in the window must remain within allowable envelope
                    within_range = (rule.threshold_min <= norm_min) and (norm_max <= rule.threshold_max)
                    is_compliant = within_range and (rule.threshold_min <= norm_mean <= rule.threshold_max)
                    if not within_range:
                        if norm_min < rule.threshold_min:
                            reason = f"Minimum observed value {float(norm_min):.2f} {rule.threshold_unit} falls below lower limit {float(rule.threshold_min):.2f} {rule.threshold_unit}"
                        else:
                            reason = f"Maximum observed value {float(norm_max):.2f} {rule.threshold_unit} exceeds upper limit {float(rule.threshold_max):.2f} {rule.threshold_unit}"
                    else:
                        reason = (
                            f"All observed values ({float(norm_min):.2f} - {float(norm_max):.2f}) and mean {float(norm_mean):.2f} {rule.threshold_unit} "
                            f"are within {float(rule.threshold_min):.2f} - {float(rule.threshold_max):.2f} {rule.threshold_unit} range"
                        )
                else:
                    reason = "Rule threshold_min or threshold_max is missing"
            else:
                reason = f"Unsupported rule operator '{rule.operator}'"

            if not is_compliant:
                has_non_compliant = True

            status_str = "compliant" if is_compliant else "non_compliant"
            param_results[p_upper] = {
                "parameter": rule.parameter,
                "observed_value": float(obs_mean) if obs_mean is not None else float(norm_mean),
                "observed_unit": obs_unit,
                "normalized_value": float(norm_mean),
                "rule_id": str(rule.rule_id) if getattr(rule, "rule_id", None) else None,
                "rule_version": getattr(rule, "rule_version", cls.RULE_VERSION) or cls.RULE_VERSION,
                "operator": rule.operator,
                "threshold": float(rule.threshold) if rule.threshold is not None else None,
                "threshold_min": float(rule.threshold_min) if rule.threshold_min is not None else None,
                "threshold_max": float(rule.threshold_max) if rule.threshold_max is not None else None,
                "threshold_unit": rule.threshold_unit,
                "status": status_str,
                "result": status_str,
                "reason": reason,
                "sample_count": len(valid_readings),
                "min_value": float(obs_min) if obs_min is not None else float(norm_min),
                "max_value": float(obs_max) if obs_max is not None else float(norm_max),
                "mean_value": float(obs_mean) if obs_mean is not None else float(norm_mean),
            }

        # Dynamic determination of required parameters based on active rules for this evaluation
        active_rule_params = {
            (r.parameter or "").strip().upper()
            for r in rules
            if getattr(r, "active", True) and (r.parameter or "").strip()
        }
        # If rules provided, require all active rule parameters; otherwise fall back to standard CPCB set
        required_parameters = active_rule_params if active_rule_params else MANDATORY_FINAL_EFFLUENT_PARAMETERS

        # Overall Status Determination
        if has_non_compliant:
            overall_status = "non_compliant"
        else:
            compliant_params = {
                k.upper() for k, v in param_results.items()
                if v.get("status") == "compliant"
            }
            all_evaluated_compliant_or_na = all(
                v.get("status") in ("compliant", "not_applicable")
                for v in param_results.values()
            ) if param_results else False

            if required_parameters.issubset(compliant_params) and all_evaluated_compliant_or_na:
                overall_status = "compliant"
            else:
                overall_status = "pending"

        return overall_status, param_results

    @classmethod
    def evaluate_treatment_record(cls, db: Session, record: TreatmentRecord) -> ComplianceResult:
        """Evaluate compliance for a treatment record and persist the result."""
        cls.ensure_default_rules(db)
        treatment_repo = TreatmentRepository(db)
        reading_repo = ReadingRepository(db)

        # Fetch active compliance rules matching temporal window and stage
        rules = treatment_repo.get_active_compliance_rules(
            stage="final_effluent",
            period_start=record.period_start,
            period_end=record.period_end,
        )

        # Get readings in window
        readings = reading_repo.get_readings_in_window(
            facility_id=record.facility_id,
            start_time=record.period_start,
            end_time=record.period_end,
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
