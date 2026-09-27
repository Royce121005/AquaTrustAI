"""
AquaTrust AI — Anomaly Detection Inference Engine Package
Exposes core inference interfaces, schemas, and custom exceptions.
"""

from ml.inference.engine import AquaTrustAnomalyInferenceEngine
from ml.inference.schemas import (
    CanonicalReadingInput,
    AnomalyInferenceOutput,
    canonicalize_parameter_name,
    CANONICAL_PARAM_MAP,
    CANONICAL_UNITS
)
from ml.inference.stream_cache import StreamContextCache
from ml.inference.exceptions import (
    InferenceEngineError,
    UnsupportedParameterError,
    InvalidReadingError,
    InvalidUnitError,
    ModelArtifactMissingError
)

__all__ = [
    "AquaTrustAnomalyInferenceEngine",
    "CanonicalReadingInput",
    "AnomalyInferenceOutput",
    "StreamContextCache",
    "canonicalize_parameter_name",
    "CANONICAL_PARAM_MAP",
    "CANONICAL_UNITS",
    "InferenceEngineError",
    "UnsupportedParameterError",
    "InvalidReadingError",
    "InvalidUnitError",
    "ModelArtifactMissingError",
]
