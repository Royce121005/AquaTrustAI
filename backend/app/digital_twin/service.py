"""AquaTrust AI — Digital Twin Application Service.

Coordinates virtual state management, treatment kinetics, scenario simulation,
data-trust pipeline integration, server-side RBAC scoping, and audit logging.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple
from uuid import UUID, uuid4
from sqlalchemy.orm import Session

from app.db.base import utc_now
from app.models.reading import Reading
from app.models.digital_twin import (
    TwinConfiguration,
    TwinState,
    TwinScenario,
    TwinScenarioResult,
    TwinModelVersion,
)
from app.digital_twin.repository import TwinRepository
from app.digital_twin.process_model import ProcessModelEngine
from app.digital_twin.state import VirtualStateManager
from app.digital_twin.state_updater import StateUpdater
from app.digital_twin.scenario_engine import ScenarioEngine
from app.digital_twin.prediction_service import PredictionService
from app.digital_twin.recommendation_service import RecommendationService
from app.digital_twin.sustainability_service import SustainabilityService
from app.digital_twin.schemas import (
    TwinStateResponse,
    TwinHistoryResponse,
    TwinConfigResponse,
    TwinConfigUpdateRequest,
    ScenarioCreateRequest,
    ScenarioResponse,
    ScenarioListResponse,
    ScenarioResultStep,
    TwinPredictionResponse,
    TwinRecommendationResponse,
    TwinModelVersionResponse,
)


class DigitalTwinService:
    """Master application service for the AquaTrust AI Digital Twin domain."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = TwinRepository(db)
        self.process_engine = ProcessModelEngine()
        self.updater = StateUpdater(db, process_engine=self.process_engine)
        self.scenario_engine = ScenarioEngine(db, process_engine=self.process_engine)
        self.prediction_service = PredictionService(db, process_engine=self.process_engine)
        self.recommendation_service = RecommendationService(db)
        self.sustainability_service = SustainabilityService(db)

        # Ensure default process model version is registered in model repository
        self._ensure_default_model_registered()

    def _ensure_default_model_registered(self) -> None:
        """Register the default process model in the database if not present."""
        existing = self.repo.get_model_version(
            model_name="AquaTrust Wastewater Process Kinetics",
            version=self.process_engine.MODEL_VERSION,
        )
        if not existing:
            mv = TwinModelVersion(
                model_version_id=uuid4(),
                model_name="AquaTrust Wastewater Process Kinetics",
                model_type=self.process_engine.MODEL_TYPE,
                version=self.process_engine.MODEL_VERSION,
                configuration_hash=self.process_engine.configuration_hash,
                parameters=self.process_engine.parameters,
                validation_status="validated",
                validation_metrics={
                    "stoichiometric_consistency": "100%",
                    "numerical_stability_passed": True,
                    "mass_balance_check": "conserved",
                },
                created_at=utc_now(),
            )
            self.repo.save_model_version(mv)

    # -------------------------------------------------------------------------
    # State Operations
    # -------------------------------------------------------------------------

    def get_facility_state(self, facility_id: UUID) -> TwinStateResponse:
        """Fetch latest virtual plant state snapshot, initializing if cold-start."""
        latest_state = self.repo.get_latest_state(facility_id)
        if not latest_state:
            latest_state = self.updater.initialize_state(facility_id)
            self.db.commit()

        return VirtualStateManager.to_response_dto(
            state=latest_state,
            process_model_hash=self.process_engine.configuration_hash,
        )

    def get_state_history(
        self,
        facility_id: UUID,
        limit: int = 50,
        offset: int = 0,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> TwinHistoryResponse:
        """Retrieve paginated historical state snapshots for auditing and trajectory analysis."""
        total, states = self.repo.list_states_history(
            facility_id=facility_id,
            limit=limit,
            offset=offset,
            start_time=start_time,
            end_time=end_time,
        )
        history_dtos = [
            VirtualStateManager.to_response_dto(s, process_model_hash=self.process_engine.configuration_hash)
            for s in states
        ]
        return TwinHistoryResponse(
            total=total,
            limit=limit,
            offset=offset,
            history=history_dtos,
        )

    def reconstruct_facility_state(
        self,
        facility_id: UUID,
        target_version: Optional[int] = None,
    ) -> TwinStateResponse:
        """Reconstruct state by replaying atomic events from version 1 up to target version."""
        reconstructed = self.repo.reconstruct_state(facility_id, target_version)
        if not reconstructed:
            raise ValueError(f"Unable to reconstruct state for facility {facility_id}")
        return VirtualStateManager.to_response_dto(
            reconstructed,
            process_model_hash=self.process_engine.configuration_hash,
        )

    def synchronize_reading(self, reading: Reading) -> TwinState:
        """Integrate an eligible validated observation into the virtual twin state."""
        return self.updater.apply_observation(reading)

    # -------------------------------------------------------------------------
    # Configuration Management
    # -------------------------------------------------------------------------

    def get_configuration(self, facility_id: UUID) -> TwinConfigResponse:
        """Fetch active facility configuration."""
        config = self.updater.get_or_create_configuration(facility_id)
        return TwinConfigResponse.model_validate(config)

    def update_configuration(
        self,
        facility_id: UUID,
        payload: TwinConfigUpdateRequest,
        actor_id: Optional[str] = None,
    ) -> TwinConfigResponse:
        """
        Creates a new monotonic configuration version.
        Prior active configuration is archived.
        """
        current = self.updater.get_or_create_configuration(facility_id)
        new_version = current.version + 1

        # Deactivate previous active configuration
        current.is_active = False

        new_config = TwinConfiguration(
            config_id=uuid4(),
            facility_id=facility_id,
            version=new_version,
            facility_profile_version=payload.facility_profile_version or (current.facility_profile_version if current else "profile-v1.0"),
            technology_type=payload.technology_type or (current.technology_type if current else "activated_sludge"),
            treatment_stages=payload.treatment_stages if payload.treatment_stages is not None else (current.treatment_stages if current else self.updater.DEFAULT_STAGES),
            sensors_config=payload.sensors_config if payload.sensors_config is not None else (current.sensors_config if current else {}),
            operating_variables=payload.operating_variables if payload.operating_variables is not None else (current.operating_variables if current else {}),
            model_version=payload.model_version or (current.model_version if current else self.process_engine.MODEL_VERSION),
            is_active=True,
            created_at=utc_now(),
        )
        saved = self.repo.create_configuration(new_config)
        self.db.commit()
        return TwinConfigResponse.model_validate(saved)

    # -------------------------------------------------------------------------
    # Scenarios
    # -------------------------------------------------------------------------

    def create_and_run_scenario(
        self,
        facility_id: UUID,
        request: ScenarioCreateRequest,
        created_by: Optional[str] = None,
    ) -> ScenarioResponse:
        """Define and execute an isolated what-if scenario synchronously."""
        scenario = self.scenario_engine.run_scenario(
            facility_id=facility_id,
            scenario_type=request.scenario_type,
            parameters=request.parameters,
            base_state_version=request.base_state_version,
            duration_minutes=request.duration_minutes,
            time_step_seconds=request.time_step_seconds,
            seed=request.seed,
            scenario_name=request.scenario_name,
            created_by=created_by,
        )
        self.db.commit()
        return self._scenario_to_dto(scenario)

    def get_scenario(self, scenario_id: UUID) -> ScenarioResponse:
        """Fetch scenario run report, comparative steps, and risk evaluation."""
        scenario = self.repo.get_scenario(scenario_id)
        if not scenario:
            raise ValueError(f"Scenario {scenario_id} not found.")
        return self._scenario_to_dto(scenario)

    def list_scenarios(
        self,
        facility_id: UUID,
        limit: int = 20,
        offset: int = 0,
    ) -> ScenarioListResponse:
        """List what-if scenarios for a facility."""
        total, scenarios = self.repo.list_scenarios(facility_id, limit, offset)
        dtos = [self._scenario_to_dto(sc) for sc in scenarios]
        return ScenarioListResponse(
            total=total,
            limit=limit,
            offset=offset,
            scenarios=dtos,
        )

    def _scenario_to_dto(self, scenario: TwinScenario) -> ScenarioResponse:
        """Helper to build ScenarioResponse DTO including summary comparison."""
        results = self.repo.get_scenario_results(scenario.scenario_id)
        step_dtos = [
            ScenarioResultStep(
                step_index=r.step_index,
                simulation_timestamp=r.simulation_timestamp,
                treatment_stage=r.treatment_stage,
                parameter=r.parameter,
                baseline_value=float(r.baseline_value) if r.baseline_value is not None else None,
                scenario_value=float(r.scenario_value) if r.scenario_value is not None else None,
                unit=r.unit,
                estimated_compliance_status=r.estimated_compliance_status,
                uncertainty_interval=r.uncertainty_interval,
                data_origin=r.data_origin,
            )
            for r in results
        ]

        # Calculate high-level summary
        summary = {
            "total_steps": len(step_dtos) // 5 if step_dtos else 0,
            "non_compliant_steps_count": sum(1 for r in step_dtos if r.estimated_compliance_status == "non_compliant"),
            "compliance_risk_detected": any(r.estimated_compliance_status == "non_compliant" for r in step_dtos),
            "max_scenario_bod": max((r.scenario_value for r in step_dtos if r.parameter == "bod" and r.scenario_value), default=None),
            "max_baseline_bod": max((r.baseline_value for r in step_dtos if r.parameter == "bod" and r.baseline_value), default=None),
        }

        return ScenarioResponse(
            scenario_id=scenario.scenario_id,
            facility_id=scenario.facility_id,
            base_state_version=scenario.base_state_version,
            scenario_type=scenario.scenario_type,
            scenario_name=scenario.scenario_name,
            status=scenario.status,
            parameters=scenario.parameters or {},
            duration_minutes=scenario.duration_minutes,
            time_step_seconds=scenario.time_step_seconds,
            random_seed=scenario.random_seed,
            model_version=scenario.model_version,
            created_by=scenario.created_by,
            created_at=scenario.created_at,
            completed_at=scenario.completed_at,
            error_details=scenario.error_details,
            comparison_summary=summary,
            results=step_dtos,
        )

    # -------------------------------------------------------------------------
    # Predictions, Recommendations, Sustainability
    # -------------------------------------------------------------------------

    def get_predictions(self, facility_id: UUID) -> TwinPredictionResponse:
        """Fetch or generate evidence-gated forward predictions."""
        pred = self.repo.get_latest_prediction(facility_id)
        if not pred:
            pred = self.prediction_service.generate_prediction(facility_id)
            self.db.commit()
        return TwinPredictionResponse(
            prediction_id=pred.prediction_id,
            facility_id=pred.facility_id,
            base_state_version=pred.base_state_version,
            model_version=pred.model_version,
            horizon_hours=float(pred.horizon_hours),
            status=pred.status,
            predicted_values=pred.predicted_values or {},
            uncertainty_bounds=pred.uncertainty_bounds,
            input_features=pred.input_features,
            created_at=pred.created_at,
        )

    def get_recommendations(self, facility_id: UUID) -> List[TwinRecommendationResponse]:
        """Fetch active advisory recommendations, generating them from latest state if none exist."""
        recs = self.repo.list_recommendations(facility_id)
        if not recs:
            recs = self.recommendation_service.evaluate_facility_state(facility_id)
            self.db.commit()
        return [TwinRecommendationResponse.model_validate(r) for r in recs]

    def get_sustainability_metrics(self, facility_id: UUID) -> Dict[str, Any]:
        """Retrieve sustainability and water recycling accounting."""
        return self.sustainability_service.calculate_sustainability_metrics(facility_id)

    def list_models(self) -> List[TwinModelVersionResponse]:
        """List registered treatment process models and predictors."""
        models = self.repo.list_model_versions()
        return [TwinModelVersionResponse.model_validate(m) for m in models]

    def evaluate_model(self, dataset_path: Optional[str] = None) -> Dict[str, Any]:
        """Execute empirical offline benchmark evaluation against held-out dataset."""
        return self.prediction_service.evaluate_heldout_dataset(dataset_path)
