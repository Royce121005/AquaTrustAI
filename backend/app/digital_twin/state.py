"""AquaTrust AI — Virtual Plant State Representation.

Encapsulates virtual STP state data structures, state freshness evaluation,
data quality determination, and stage-by-stage physical summaries.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from uuid import UUID

from app.models.digital_twin import TwinState, TwinConfiguration
from app.digital_twin.schemas import (
    TwinStateResponse,
    ProcessModelStatus,
    ObservationValue,
    TreatmentStageState,
    StateFreshnessType,
    DataQualityType,
)


class VirtualStateManager:
    """Helper for evaluating state freshness, data quality, and constructing API response objects."""

    FRESHNESS_FRESH_SECONDS = 7200     # <= 2 hours is 'fresh'
    FRESHNESS_STALE_SECONDS = 21600    # 2 - 6 hours is 'stale', > 6 hours is 'expired'

    @classmethod
    def evaluate_freshness(
        cls,
        last_accepted_at: Optional[datetime],
        now: Optional[datetime] = None,
    ) -> StateFreshnessType:
        """Evaluates state freshness based on the last accepted observation timestamp."""
        if last_accepted_at is None:
            return "expired"

        current_time = now or datetime.now(timezone.utc)
        if last_accepted_at.tzinfo is None:
            last_accepted_at = last_accepted_at.replace(tzinfo=timezone.utc)
        if current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=timezone.utc)

        delta_seconds = (current_time - last_accepted_at).total_seconds()
        if delta_seconds < 0:
            # Future timestamp edge case
            return "fresh"
        if delta_seconds <= cls.FRESHNESS_FRESH_SECONDS:
            return "fresh"
        if delta_seconds <= cls.FRESHNESS_STALE_SECONDS:
            return "stale"
        return "expired"

    @classmethod
    def determine_data_quality(
        cls,
        observations: Dict[str, Any],
        recent_rejections: Optional[List[Dict[str, Any]]] = None,
    ) -> DataQualityType:
        """
        Determines overall virtual plant data quality from latest observations and rejection flags.
        """
        if not observations:
            return "insufficient_data"

        # If there are active rejected readings that haven't been corrected
        if recent_rejections and len(recent_rejections) > 0:
            return "invalid"

        qualities = [
            obs.get("quality_status", "valid")
            for obs in observations.values()
            if isinstance(obs, dict)
        ]

        if any(q == "invalid" for q in qualities):
            return "invalid"
        if any(q == "suspect" for q in qualities):
            return "suspect"
        if any(q == "insufficient_data" for q in qualities):
            return "insufficient_data"

        # Mandatory parameter coverage check
        required_params = {"bod", "cod", "tss", "ph"}
        present = {k.lower() for k in observations.keys()}
        if not required_params.issubset(present):
            return "insufficient_data"

        return "valid"

    @classmethod
    def to_response_dto(
        cls,
        state: TwinState,
        process_model_hash: Optional[str] = None,
        now: Optional[datetime] = None,
    ) -> TwinStateResponse:
        """Converts an ORM TwinState entity to a typed Pydantic response DTO."""
        freshness = cls.evaluate_freshness(state.last_accepted_observation_at, now=now)

        # Build observations map
        obs_dto_map = {}
        for param, raw_obs in (state.latest_observations or {}).items():
            if isinstance(raw_obs, dict):
                raw_src = raw_obs.get("source", "observed")
                norm_src = "observed" if str(raw_src).lower() in ("observed", "telemetry", "sensor", "manual_lab") else ("simulated" if "sim" in str(raw_src).lower() else "observed")
                obs_dto_map[param] = ObservationValue(
                    value=raw_obs.get("value"),
                    unit=raw_obs.get("unit", "mg/L"),
                    source=norm_src,
                    quality_status=raw_obs.get("quality_status", "valid"),
                    observed_at=raw_obs.get("observed_at"),
                    reading_id=UUID(raw_obs["reading_id"]) if raw_obs.get("reading_id") else None,
                    sensor_id=UUID(raw_obs["sensor_id"]) if raw_obs.get("sensor_id") else None,
                )

        # Build stage states map
        stage_dto_map = {}
        for stage_id, stage_data in (state.stage_states or {}).items():
            if isinstance(stage_data, dict):
                stage_params = {}
                for p_name, p_val in stage_data.get("parameters", {}).items():
                    if isinstance(p_val, dict):
                        p_dict = dict(p_val)
                        if "source" in p_dict:
                            p_src = str(p_dict["source"]).lower()
                            p_dict["source"] = "observed" if p_src in ("observed", "telemetry", "sensor", "manual_lab") else ("simulated" if "sim" in p_src else ("predicted" if "pred" in p_src else "observed"))
                        stage_params[p_name] = ObservationValue(**p_dict)
                    elif isinstance(p_val, (int, float)):
                        stage_params[p_name] = ObservationValue(
                            value=float(p_val),
                            unit="pH units" if p_name == "ph" else "mg/L",
                            source="predicted" if stage_id != "inlet" else "observed",
                            quality_status="valid",
                        )
                stage_dto_map[stage_id] = TreatmentStageState(
                    stage_id=stage_id,
                    stage_name=stage_data.get("stage_name", stage_id.replace("_", " ").title()),
                    sequence_order=stage_data.get("sequence_order", 0),
                    operating_status=stage_data.get("operating_status", "nominal"),
                    parameters=stage_params,
                    operating_variables=stage_data.get("operating_variables", {}),
                    modeled_outputs=stage_data.get("modeled_outputs", {}),
                    flags=stage_data.get("flags", []),
                )

        norm_mode = "live" if str(state.source_mode).lower() in ("live", "telemetry", "sensor") else ("historical_replay" if str(state.source_mode).lower() == "historical_replay" else "simulation")

        return TwinStateResponse(
            facility_id=state.facility_id,
            state_version=state.state_version,
            observed_at=state.observed_at,
            source_mode=norm_mode,
            facility_profile_version=state.facility_profile_version,
            state_freshness=freshness,
            data_quality=state.data_quality,
            last_accepted_observation_at=state.last_accepted_observation_at,
            latest_received_observation_at=state.latest_received_observation_at,
            process_model=ProcessModelStatus(
                version=state.process_model_version,
                status="ready",
                configuration_hash=process_model_hash,
                evaluated_at=state.observed_at,
            ),
            observations=obs_dto_map,
            stage_states=stage_dto_map,
            sensor_states=state.sensor_states or {},
            predictions=None,
            last_processed_reading_id=state.last_processed_reading_id,
            created_at=state.created_at,
        )
