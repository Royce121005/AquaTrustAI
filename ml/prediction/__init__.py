"""
AquaTrust AI — Treatment Quality Prediction Package (Phase 3)
Exposes the predictive inference engine, input schemas, and output contracts.
"""

from ml.prediction.engine import AquaTrustTreatmentPredictionEngine
from ml.prediction.schemas import (
    TreatmentPredictionInput,
    PredictedParameter,
    TreatmentQualityPredictionOutput,
    CPCB_DISCHARGE_LIMITS,
)

__all__ = [
    "AquaTrustTreatmentPredictionEngine",
    "TreatmentPredictionInput",
    "PredictedParameter",
    "TreatmentQualityPredictionOutput",
    "CPCB_DISCHARGE_LIMITS",
]
