"""AquaTrust AI — Virtual State Updater Engine.

Synchronises incoming validated observations with the persistent virtual STP state.
Enforces non-overwrite invariants for invalid observations, handles out-of-order data,
increments monotonic state versions, recalculates treatment process kinetics, and records
verifiable state transition events.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, Any, List
from uuid import UUID, uuid4
from sqlalchemy.orm import Session

from app.db.base import utc_now
from app.models.reading import Reading
from app.models.digital_twin import (
    TwinConfiguration,
    TwinState,
    TwinStateEvent,
    TwinModelVersion,
)
from app.digital_twin.repository import TwinRepository
from app.digital_twin.process_model import ProcessModelEngine
from app.digital_twin.state import VirtualStateManager


class StateUpdater:
    """Orchestrates atomic virtual state transitions from physical or simulated telemetry."""

    DEFAULT_STAGES = [
        {"stage_id": "inlet", "stage_name": "Raw Influent", "sequence_order": 1},
        {"stage_id": "primary_clarifier", "stage_name": "Primary Clarifier", "sequence_order": 2},
        {"stage_id": "biological_aeration", "stage_name": "Biological Aeration Basin", "sequence_order": 3},
        {"stage_id": "secondary_clarifier", "stage_name": "Secondary Clarifier", "sequence_order": 4},
        {"stage_id": "final_effluent", "stage_name": "Final Effluent", "sequence_order": 5},
    ]

    def __init__(self, db: Session, process_engine: Optional[ProcessModelEngine] = None):
        self.db = db
        self.repo = TwinRepository(db)
        self.process_engine = process_engine or ProcessModelEngine()

    def get_or_create_configuration(self, facility_id: UUID) -> TwinConfiguration:
        """Fetch active facility configuration or initialize default configuration."""
        config = self.repo.get_active_configuration(facility_id)
        if config:
            return config

        config = TwinConfiguration(
            config_id=uuid4(),
            facility_id=facility_id,
            version=1,
            facility_profile_version="profile-v1.0",
            technology_type="activated_sludge",
            treatment_stages=self.DEFAULT_STAGES,
            sensors_config={
                "bod": {"unit": "mg/L", "stage": "final_effluent"},
                "cod": {"unit": "mg/L", "stage": "final_effluent"},
                "tss": {"unit": "mg/L", "stage": "final_effluent"},
                "ph": {"unit": "pH units", "stage": "final_effluent"},
                "nh4_n": {"unit": "mg/L", "stage": "final_effluent"},
            },
            operating_variables={
                "design_capacity_mld": 10.0,
                "hrt_hours": 8.0,
                "do_setpoint_mg_l": 2.0,
                "temperature_c": 20.0,
            },
            model_version=self.process_engine.MODEL_VERSION,
            is_active=True,
            created_at=utc_now(),
        )
        return self.repo.create_configuration(config)

    def initialize_state(self, facility_id: UUID, observed_at: Optional[datetime] = None) -> TwinState:
        """Initializes state version 1 with nominal baseline for cold-start facilities."""
        config = self.get_or_create_configuration(facility_id)
        ts = observed_at or utc_now()

        # Nominal baseline observations
        nominal_obs = {
            "bod": {"value": 180.0, "unit": "mg/L", "source": "simulated", "quality_status": "valid", "observed_at": ts.isoformat()},
            "cod": {"value": 400.0, "unit": "mg/L", "source": "simulated", "quality_status": "valid", "observed_at": ts.isoformat()},
            "tss": {"value": 220.0, "unit": "mg/L", "source": "simulated", "quality_status": "valid", "observed_at": ts.isoformat()},
            "ph": {"value": 7.4, "unit": "pH units", "source": "simulated", "quality_status": "valid", "observed_at": ts.isoformat()},
            "nh4_n": {"value": 35.0, "unit": "mg/L", "source": "simulated", "quality_status": "valid", "observed_at": ts.isoformat()},
        }

        influent_vals = {k: v["value"] for k, v in nominal_obs.items()}
        status, eval_results = self.process_engine.evaluate_stages(
            influent_observations=influent_vals,
            operating_variables=config.operating_variables,
        )

        initial_state = TwinState(
            state_id=uuid4(),
            facility_id=facility_id,
            state_version=1,
            observed_at=ts,
            source_mode="simulation",
            facility_profile_version=config.facility_profile_version,
            stage_states=eval_results.get("stages", {}),
            sensor_states={},
            latest_observations=nominal_obs,
            last_accepted_observation_at=ts,
            latest_received_observation_at=ts,
            data_quality="valid",
            state_freshness="fresh",
            process_model_version=self.process_engine.MODEL_VERSION,
            last_processed_reading_id=None,
            created_at=utc_now(),
        )
        saved_state = self.repo.save_state(initial_state)

        # Record initialization event
        self.repo.record_event(
            TwinStateEvent(
                event_id=uuid4(),
                facility_id=facility_id,
                reading_id=None,
                previous_state_version=None,
                new_state_version=1,
                event_type="state_initialized",
                event_payload={
                    "observed_at": ts.isoformat(),
                    "observations": nominal_obs,
                    "model_version": self.process_engine.MODEL_VERSION,
                },
                created_at=utc_now(),
            )
        )
        return saved_state

    def apply_observation(self, reading: Reading) -> TwinState:
        """
        Applies a single validated reading to the virtual state.
        Enforces idempotency, non-overwrite of invalid data, and event provenance.
        """
        facility_id = reading.facility_id
        config = self.get_or_create_configuration(facility_id)
        latest_state = self.repo.get_latest_state(facility_id)

        if not latest_state:
            latest_state = self.initialize_state(facility_id, observed_at=reading.observed_at)

        # Idempotency check: if already processed this exact reading, return existing state
        if latest_state.last_processed_reading_id == reading.reading_id:
            return latest_state

        param_slug = (reading.parameter or "").lower()
        reading_val = float(reading.value) if reading.value is not None else None
        reading_time = reading.observed_at
        if reading_time.tzinfo is None:
            reading_time = reading_time.replace(tzinfo=timezone.utc)

        new_version = latest_state.state_version + 1
        obs_copy = dict(latest_state.latest_observations or {})
        sensor_states = dict(latest_state.sensor_states or {})
        stage_states = dict(latest_state.stage_states or {})
        last_accepted = latest_state.last_accepted_observation_at
        latest_received = reading_time

        # Ensure timezone
        if last_accepted and last_accepted.tzinfo is None:
            last_accepted = last_accepted.replace(tzinfo=timezone.utc)

        sensor_key = str(reading.sensor_id) if reading.sensor_id else f"sensor_{param_slug}"

        # -------------------------------------------------------------
        # Branch A: Invalid or Suspect Reading Handling (Non-Overwrite Rule)
        # -------------------------------------------------------------
        if reading.quality_status in ("invalid", "suspect", "insufficient_data"):
            # Record rejection or suspect warning in sensor states
            sensor_states[sensor_key] = {
                "parameter": param_slug,
                "latest_received_value": reading_val,
                "quality_status": reading.quality_status,
                "received_at": reading_time.isoformat(),
                "flags": reading.provenance.get("validation_flags", []) if reading.provenance else [],
                "is_active_observation": False,
            }

            event_type = (
                "observation_rejected"
                if reading.quality_status == "invalid"
                else f"observation_flagged_{reading.quality_status}"
            )

            # Data quality degrades
            data_quality = (
                "invalid"
                if reading.quality_status == "invalid"
                else ("suspect" if latest_state.data_quality != "invalid" else "invalid")
            )

            new_state = TwinState(
                state_id=uuid4(),
                facility_id=facility_id,
                state_version=new_version,
                observed_at=latest_state.observed_at,  # Physical observed clock retains accepted observation
                source_mode=latest_state.source_mode,
                facility_profile_version=latest_state.facility_profile_version,
                stage_states=stage_states,
                sensor_states=sensor_states,
                latest_observations=obs_copy,  # Non-overwrite invariant: retained accepted state
                last_accepted_observation_at=last_accepted,
                latest_received_observation_at=latest_received,
                data_quality=data_quality,
                state_freshness=VirtualStateManager.evaluate_freshness(last_accepted),
                process_model_version=latest_state.process_model_version,
                last_processed_reading_id=reading.reading_id,
                created_at=utc_now(),
            )
            saved_state = self.repo.save_state(new_state)

            self.repo.record_event(
                TwinStateEvent(
                    event_id=uuid4(),
                    facility_id=facility_id,
                    reading_id=reading.reading_id,
                    previous_state_version=latest_state.state_version,
                    new_state_version=new_version,
                    event_type=event_type,
                    event_payload={
                        "parameter": param_slug,
                        "rejected_value": reading_val,
                        "quality_status": reading.quality_status,
                        "observed_at": reading_time.isoformat(),
                    },
                    created_at=utc_now(),
                )
            )
            return saved_state

        # -------------------------------------------------------------
        # Branch B: Valid Observation Handling
        raw_src = getattr(reading, "source", "observed") or "observed"
        norm_source = "observed" if str(raw_src).lower() in ("observed", "telemetry", "sensor", "manual_lab") else ("simulated" if "sim" in str(raw_src).lower() else "observed")

        obs_copy[param_slug] = {
            "value": reading_val,
            "unit": reading.unit,
            "source": norm_source,
            "quality_status": "valid",
            "observed_at": reading_time.isoformat(),
            "reading_id": str(reading.reading_id),
            "sensor_id": str(reading.sensor_id) if reading.sensor_id else None,
        }

        sensor_states[sensor_key] = {
            "parameter": param_slug,
            "latest_received_value": reading_val,
            "quality_status": "valid",
            "received_at": reading_time.isoformat(),
            "reading_id": str(reading.reading_id),
            "is_active_observation": True,
        }

        # Update timestamps
        if last_accepted is None or reading_time > last_accepted:
            last_accepted = reading_time
        state_observed_at = max(latest_state.observed_at, reading_time)

        # Recalculate treatment kinetics only when mandatory parameters are available
        has_required_params = all(
            p in obs_copy and obs_copy[p].get("value") is not None
            for p in ["bod", "cod", "tss", "ph"]
        )
        if has_required_params:
            influent_inputs = {
                p: float(obs_copy[p]["value"])
                for p in ["bod", "cod", "tss", "ph"]
            }
            if "nh4_n" in obs_copy and obs_copy["nh4_n"].get("value") is not None:
                influent_inputs["nh4_n"] = float(obs_copy["nh4_n"]["value"])

            model_status, eval_results = self.process_engine.evaluate_stages(
                influent_observations=influent_inputs,
                operating_variables=config.operating_variables,
            )
            if model_status == "ready":
                stage_states = eval_results.get("stages", stage_states)
        else:
            stage_states = latest_state.stage_states or {}

        # Assess data quality
        overall_quality = VirtualStateManager.determine_data_quality(obs_copy)

        new_state = TwinState(
            state_id=uuid4(),
            facility_id=facility_id,
            state_version=new_version,
            observed_at=state_observed_at,
            source_mode="live" if str(raw_src).lower() in ("live", "telemetry", "sensor", "manual_lab", "observed") else ("historical_replay" if str(raw_src).lower() == "historical_replay" else "simulation"),
            facility_profile_version=config.facility_profile_version,
            stage_states=stage_states,
            sensor_states=sensor_states,
            latest_observations=obs_copy,
            last_accepted_observation_at=last_accepted,
            latest_received_observation_at=latest_received,
            data_quality=overall_quality,
            state_freshness=VirtualStateManager.evaluate_freshness(last_accepted),
            process_model_version=self.process_engine.MODEL_VERSION,
            last_processed_reading_id=reading.reading_id,
            created_at=utc_now(),
        )
        saved_state = self.repo.save_state(new_state)

        self.repo.record_event(
            TwinStateEvent(
                event_id=uuid4(),
                facility_id=facility_id,
                reading_id=reading.reading_id,
                previous_state_version=latest_state.state_version,
                new_state_version=new_version,
                event_type="observation_applied",
                event_payload={
                    "parameter": param_slug,
                    "value": reading_val,
                    "unit": reading.unit,
                    "source": reading.source,
                    "observed_at": reading_time.isoformat(),
                },
                created_at=utc_now(),
            )
        )
        return saved_state

    def apply_batch(self, readings: List[Reading]) -> Optional[TwinState]:
        """Applies a sequence of readings in chronological order."""
        if not readings:
            return None
        sorted_readings = sorted(readings, key=lambda r: r.observed_at)
        last_state = None
        for r in sorted_readings:
            last_state = self.apply_observation(r)
        return last_state
