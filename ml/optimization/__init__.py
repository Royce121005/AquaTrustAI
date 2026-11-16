"""
AquaTrust AI — Sustainability & Resource Optimization Package (Phase 5)
Exposes the optimization engine, data schemas, and sustainability KPI models.
"""

from ml.optimization.engine import AquaTrustResourceOptimizer
from ml.optimization.schemas import (
    ResourceOptimizationInput,
    AerationOptimizationResult,
    ChemicalOptimizationResult,
    SustainabilityKpiResult,
    ResourceOptimizationOutput,
)

__all__ = [
    "AquaTrustResourceOptimizer",
    "ResourceOptimizationInput",
    "AerationOptimizationResult",
    "ChemicalOptimizationResult",
    "SustainabilityKpiResult",
    "ResourceOptimizationOutput",
]
