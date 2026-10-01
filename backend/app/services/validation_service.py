"""AquaTrust AI — Deterministic Pre-AI Data-Trust Validation Service.

Executes physical bounds, canonical unit validation, temporal checks, rate-of-change limits,
missing value detection, duplicate detection, and stoichiometric constraints (BOD <= COD, TN >= TKN >= NH4_N).
"""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Tuple, List, Optional, Dict
from uuid import uuid4, UUID
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import utc_now
from app.models.reading import Reading
from app.models.validation_result import ValidationResult
from app.repositories.reading_repository import ReadingRepository

# Physical parameter range boundaries
PHYSICAL_RANGES = {
    "BOD": (Decimal("0.0"), Decimal("5000.0")),
    "COD": (Decimal("0.0"), Decimal("10000.0")),
    "TSS": (Decimal("0.0"), Decimal("5000.0")),
    "PH": (Decimal("0.0"), Decimal("14.0")),
    "NH4_N": (Decimal("0.0"), Decimal("500.0")),
    "TN": (Decimal("0.0"), Decimal("1000.0")),
    "NOX_N": (Decimal("0.0"), Decimal("500.0")),
    "TKN": (Decimal("0.0"), Decimal("1000.0")),
    "COND": (Decimal("0.0"), Decimal("50000.0")),
    "FLOW_RATE": (Decimal("0.0"), Decimal("5000000.0")),
}

# Canonical allowed units per parameter
CANONICAL_PARAM_UNITS = {
    "BOD": {"mg/L", "mg/l", "ppm"},
    "COD": {"mg/L", "mg/l", "ppm"},
    "TSS": {"mg/L", "mg/l", "ppm"},
    "PH": {"pH units", "pH_units", "pH", "ph", "units", "standard units"},
    "NH4_N": {"mg/L", "mg/l", "ppm", "mg/L N", "mg/L as N", "mg-N/L"},
    "TKN": {"mg/L", "mg/l", "ppm", "mg/L N", "mg/L as N", "mg-N/L"},
    "TN": {"mg/L", "mg/l", "ppm", "mg/L N", "mg/L as N", "mg-N/L"},
    "NOX_N": {"mg/L", "mg/l", "ppm", "mg/L N", "mg/L as N", "mg-N/L"},
    "COND": {"uS/cm", "µS/cm", "μS/cm", "mS/cm", "uS/cm at 25C"},
    "FLOW_RATE": {"m3/day", "MLD", "m3/h", "m³/day", "m³/h", "L/s", "l/s", "gpm", "MGD"},
}


class ValidationService:
    """Service evaluating deterministic data-trust rules on telemetry readings."""

    VALIDATION_VERSION = "1.1.0"

    @classmethod
    def determine_quality_status(cls, flags: List[str]) -> str:
        """Derive overall quality_status string from accumulated validation flags."""
        if not flags:
            return "valid"
        if "NULL_OR_MISSING_VALUE" in flags and not any(
            f.startswith("OUT_OF_BOUNDS")
            or f.startswith("INVALID_UNIT_FOR_")
            or f.startswith("CROSS_PARAM_")
            or f in ("FUTURE_TIMESTAMP_ERROR", "DUPLICATE_OBSERVATION")
            for f in flags
        ):
            return "insufficient_data"
        if any(
            f.startswith("OUT_OF_BOUNDS")
            or f.startswith("INVALID_UNIT_FOR_")
            or f.startswith("CROSS_PARAM_")
            or f in ("FUTURE_TIMESTAMP_ERROR", "DUPLICATE_OBSERVATION", "NULL_OR_MISSING_VALUE")
            for f in flags
        ):
            return "invalid"
        return "suspect"

    @classmethod
    def evaluate(cls, reading: Reading, previous_reading: Optional[Reading] = None) -> Tuple[str, List[str]]:
        """Evaluate deterministic validation rules for a single observation.

        Returns:
            Tuple of (quality_status, validation_flags)
        """
        flags: List[str] = []
        param = (reading.parameter or "").upper()

        # 1. Missing Value / Null check
        if reading.value is None:
            flags.append("NULL_OR_MISSING_VALUE")

        # 2. Timestamp temporal validity
        if reading.observed_at is not None:
            now = utc_now()
            obs = reading.observed_at
            if obs.tzinfo is None:
                obs = obs.replace(tzinfo=timezone.utc)
            if obs > now + timedelta(minutes=5):
                flags.append("FUTURE_TIMESTAMP_ERROR")
            elif obs < now - timedelta(days=365):
                flags.append("STALE_HISTORICAL_TIMESTAMP")

        # 3. Canonical Unit validation
        unit = (reading.unit or "").strip()
        if param in CANONICAL_PARAM_UNITS:
            allowed = CANONICAL_PARAM_UNITS[param]
            allowed_lower = {u.lower() for u in allowed}
            if not unit or (unit not in allowed and unit.lower() not in allowed_lower):
                flags.append(f"INVALID_UNIT_FOR_{param}")

        # If missing value, return immediately
        if reading.value is None:
            quality_status = cls.determine_quality_status(flags)
            return quality_status, flags

        val = Decimal(str(reading.value))

        # 4. Physical boundary enforcement
        if param in PHYSICAL_RANGES:
            min_val, max_val = PHYSICAL_RANGES[param]
            if val < min_val:
                flags.append(f"OUT_OF_BOUNDS_BELOW_MIN_{param}")
            elif val > max_val:
                flags.append(f"OUT_OF_BOUNDS_ABOVE_MAX_{param}")

        # 5. Parameter specific constraints
        if param == "PH" and (val < Decimal("2.0") or val > Decimal("12.0")):
            flags.append("EXTREME_PH_ANOMALY")

        # 6. Rate-of-change check against previous reading
        if previous_reading is not None and previous_reading.value is not None:
            prev_val = Decimal(str(previous_reading.value))
            if prev_val > Decimal("0.0"):
                pct_change = abs(val - prev_val) / prev_val
                if pct_change > Decimal("5.0") and abs(val - prev_val) > Decimal("50.0"):
                    flags.append(f"EXTREME_SPIKE_RATE_OF_CHANGE_{param}")

        # Determine overall quality status
        quality_status = cls.determine_quality_status(flags)
        return quality_status, flags

    @classmethod
    def validate_reading(cls, db: Session, reading: Reading) -> ValidationResult:
        """Validate a reading against database context and persist validation result."""
        reading_repo = ReadingRepository(db)

        # Look up previous reading for rate of change
        history = reading_repo.get_historical_stream_window(
            facility_id=reading.facility_id,
            parameter=reading.parameter,
            measurement_stage=reading.treatment_stage,
            limit=2,
        )
        prev_reading = history[0] if len(history) > 1 else None

        quality_status, flags = cls.evaluate(reading, prev_reading)

        # 1. Duplicate observation detection: identical reading for (facility_id, parameter, treatment_stage, observed_at)
        dup_query = select(Reading.reading_id).where(
            Reading.facility_id == reading.facility_id,
            Reading.parameter == reading.parameter,
            Reading.observed_at == reading.observed_at,
            Reading.reading_id != reading.reading_id,
        )
        if reading.treatment_stage is not None:
            dup_query = dup_query.where(Reading.treatment_stage == reading.treatment_stage)
        else:
            dup_query = dup_query.where(Reading.treatment_stage.is_(None))

        if db.scalar(dup_query.limit(1)) is not None:
            flags.append("DUPLICATE_OBSERVATION")

        # 2. Cross-parameter stoichiometric consistency checks (+/- 15 min window for same facility and stage)
        if reading.value is not None and reading.observed_at is not None:
            val = Decimal(str(reading.value))
            param = (reading.parameter or "").upper()

            contemp_readings = reading_repo.get_contemporaneous_readings(
                facility_id=reading.facility_id,
                observed_at=reading.observed_at,
                tolerance_seconds=900,  # +/- 15 min window
                treatment_stage=reading.treatment_stage,
            )
            contemp = [r for r in contemp_readings if r.reading_id != reading.reading_id and r.value is not None]

            # A. COD vs BOD consistency (COD must be >= BOD)
            if param == "COD":
                for cr in contemp:
                    if (cr.parameter or "").upper() == "BOD" and cr.value is not None:
                        bod_val = Decimal(str(cr.value))
                        if val < bod_val:
                            flags.append("CROSS_PARAM_COD_LESS_THAN_BOD")
                            cls._retroactive_flag_reading(db, reading_repo, cr, "CROSS_PARAM_COD_LESS_THAN_BOD")
                            break
            elif param == "BOD":
                for cr in contemp:
                    if (cr.parameter or "").upper() == "COD" and cr.value is not None:
                        cod_val = Decimal(str(cr.value))
                        if cod_val < val:
                            flags.append("CROSS_PARAM_COD_LESS_THAN_BOD")
                            cls._retroactive_flag_reading(db, reading_repo, cr, "CROSS_PARAM_COD_LESS_THAN_BOD")
                            break

            # B. Nitrogen species stoichiometric consistency: TN >= TKN >= NH4_N (with 2% sensor noise tolerance)
            nitrogen_params = {"TN", "TKN", "NH4_N"}
            if param in nitrogen_params:
                nitrogen_vals: Dict[str, Decimal] = {param: val}
                nitrogen_objs: Dict[str, Reading] = {param: reading}
                for cr in contemp:
                    cr_param = (cr.parameter or "").upper()
                    if cr_param in nitrogen_params and cr.value is not None and cr_param not in nitrogen_vals:
                        nitrogen_vals[cr_param] = Decimal(str(cr.value))
                        nitrogen_objs[cr_param] = cr

                tn = nitrogen_vals.get("TN")
                tkn = nitrogen_vals.get("TKN")
                nh4 = nitrogen_vals.get("NH4_N")
                eps = Decimal("0.98")  # 2% calibration tolerance

                if (tn is not None and tkn is not None and tn < (tkn * eps)) or \
                   (tkn is not None and nh4 is not None and tkn < (nh4 * eps)) or \
                   (tn is not None and nh4 is not None and tn < (nh4 * eps)):
                    flags.append("CROSS_PARAM_NITROGEN_IMBALANCE")
                    for p_key, obj in nitrogen_objs.items():
                        if obj.reading_id != reading.reading_id:
                            cls._retroactive_flag_reading(db, reading_repo, obj, "CROSS_PARAM_NITROGEN_IMBALANCE")

        # Deduplicate flags while preserving order
        flags = list(dict.fromkeys(flags))

        # Re-derive overall quality status with database checks
        quality_status = cls.determine_quality_status(flags)

        # Update reading status
        reading.quality_status = quality_status

        # Create or update validation result
        existing = reading_repo.get_validation_result(reading.reading_id)
        if existing:
            existing.quality_status = quality_status
            existing.validation_flags = flags
            existing.validated_at = utc_now()
            db.flush()
            return existing

        val_res = ValidationResult(
            validation_result_id=uuid4(),
            reading_id=reading.reading_id,
            quality_status=quality_status,
            validation_flags=flags,
            validation_version=cls.VALIDATION_VERSION,
            validated_at=utc_now(),
        )
        reading_repo.add_validation_result(val_res)
        db.flush()
        return val_res

    @classmethod
    def _retroactive_flag_reading(cls, db: Session, reading_repo: ReadingRepository, reading: Reading, flag: str):
        """Retroactively mark a contemporaneous reading with cross-parameter violation flag."""
        cr_val_res = reading_repo.get_validation_result(reading.reading_id)
        if cr_val_res:
            cur_flags = list(cr_val_res.validation_flags or [])
            if flag not in cur_flags:
                cur_flags.append(flag)
                cr_val_res.validation_flags = cur_flags
                cr_val_res.quality_status = cls.determine_quality_status(cur_flags)
                cr_val_res.validated_at = utc_now()
                reading.quality_status = cr_val_res.quality_status
                # Also update anomaly result if present to insufficient_data
                cr_anom = reading_repo.get_anomaly_result(reading.reading_id)
                if cr_anom:
                    cr_anom.anomaly_status = "insufficient_data"
                    cr_anom.anomaly_score = None
                    if isinstance(cr_anom.model_metadata, dict):
                        cr_anom.model_metadata["retroactive_invalidation"] = flag
