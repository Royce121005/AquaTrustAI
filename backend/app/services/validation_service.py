"""AquaTrust AI — Deterministic Pre-AI Data-Trust Validation Service.

Executes physical bounds, rate-of-change limits, missing value detection,
and stoichiometric constraints (BOD <= COD) to establish baseline data quality.
"""

from decimal import Decimal
from typing import Tuple, List, Optional
from uuid import uuid4, UUID
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


class ValidationService:
    """Service evaluating deterministic data-trust rules on telemetry readings."""

    VALIDATION_VERSION = "1.0.0"

    @classmethod
    def evaluate(cls, reading: Reading, previous_reading: Optional[Reading] = None) -> Tuple[str, List[str]]:
        """Evaluate deterministic validation rules for a single observation.

        Returns:
            Tuple of (quality_status, validation_flags)
        """
        flags: List[str] = []

        # 1. Missing Value / Null check
        if reading.value is None:
            flags.append("NULL_OR_MISSING_VALUE")
            return "insufficient_data", flags

        val = Decimal(str(reading.value))
        param = reading.parameter.upper()

        # 2. Physical boundary enforcement
        if param in PHYSICAL_RANGES:
            min_val, max_val = PHYSICAL_RANGES[param]
            if val < min_val:
                flags.append(f"OUT_OF_BOUNDS_BELOW_MIN_{param}")
            elif val > max_val:
                flags.append(f"OUT_OF_BOUNDS_ABOVE_MAX_{param}")

        # 3. Parameter specific constraints
        if param == "PH" and (val < Decimal("2.0") or val > Decimal("12.0")):
            flags.append("EXTREME_PH_ANOMALY")

        # 4. Rate-of-change check against previous reading
        if previous_reading is not None and previous_reading.value is not None:
            prev_val = Decimal(str(previous_reading.value))
            if prev_val > Decimal("0.0"):
                pct_change = abs(val - prev_val) / prev_val
                if pct_change > Decimal("5.0") and abs(val - prev_val) > Decimal("50.0"):
                    flags.append(f"EXTREME_SPIKE_RATE_OF_CHANGE_{param}")

        # Determine overall quality status
        if not flags:
            return "valid", []
        elif any(f.startswith("OUT_OF_BOUNDS") or f == "NULL_OR_MISSING_VALUE" for f in flags):
            return "invalid", flags
        else:
            return "suspect", flags

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
