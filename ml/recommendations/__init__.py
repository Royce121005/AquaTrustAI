"""
AquaTrust AI — Process Recommendations Package (Phase 4)
Exposes the recommendation engine, schemas, categories, and severity levels.
"""

from ml.recommendations.engine import AquaTrustProcessRecommendationEngine
from ml.recommendations.schemas import (
    ProcessRecommendation,
    RecommendationCategory,
    RecommendationSeverity,
    RecommendationUrgency,
    ParameterTarget,
    RecommendationBatchOutput,
)

__all__ = [
    "AquaTrustProcessRecommendationEngine",
    "ProcessRecommendation",
    "RecommendationCategory",
    "RecommendationSeverity",
    "RecommendationUrgency",
    "ParameterTarget",
    "RecommendationBatchOutput",
]
