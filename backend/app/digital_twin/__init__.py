"""AquaTrust AI — Digital Twin Domain Package.

Provides persistent virtual STP state representations, versioned state history,
process kinetics calculations, what-if scenarios, and evidence-gated decision support.
"""

from app.digital_twin.schemas import (
    TwinStateResponse,
    TwinHistoryResponse,
    TwinConfigResponse,
    TwinConfigUpdateRequest,
    ScenarioCreateRequest,
    ScenarioResponse,
    ScenarioListResponse,
    TwinPredictionResponse,
    TwinRecommendationResponse,
    TwinModelVersionResponse,
)
from app.digital_twin.process_model import ProcessModelEngine
from app.digital_twin.state import VirtualStateManager
from app.digital_twin.state_updater import StateUpdater
from app.digital_twin.scenario_engine import ScenarioEngine
from app.digital_twin.service import DigitalTwinService
from app.digital_twin.repository import TwinRepository

__all__ = [
    "TwinStateResponse",
    "TwinHistoryResponse",
    "TwinConfigResponse",
    "TwinConfigUpdateRequest",
    "ScenarioCreateRequest",
    "ScenarioResponse",
    "ScenarioListResponse",
    "TwinPredictionResponse",
    "TwinRecommendationResponse",
    "TwinModelVersionResponse",
    "ProcessModelEngine",
    "VirtualStateManager",
    "StateUpdater",
    "ScenarioEngine",
    "DigitalTwinService",
    "TwinRepository",
]
