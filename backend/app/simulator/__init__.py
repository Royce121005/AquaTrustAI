"""
AquaTrust AI — Runtime Telemetry Simulator Package (Member 2)
Provides synthetic telemetry generation, statistical profile loading,
anomaly scenario injection, and online AI inference integration.
"""

from backend.app.simulator.schemas import FacilityStreamConfig, ScenarioGroundTruth, SimulatedReadingPayload
from backend.app.simulator.profile_loader import ProfileLoader
from backend.app.simulator.anomalies import AnomalyInjector
from backend.app.simulator.engine import AquaTrustRuntimeSimulator

__all__ = [
    "FacilityStreamConfig",
    "ScenarioGroundTruth",
    "SimulatedReadingPayload",
    "ProfileLoader",
    "AnomalyInjector",
    "AquaTrustRuntimeSimulator"
]
