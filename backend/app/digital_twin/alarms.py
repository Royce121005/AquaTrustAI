"""AquaTrust AI — Digital Twin SCADA Alarm & Event Lifecycle Engine.

Evaluates treatment process kinetics and sensor data quality against CPCB standards
and plant operational constraints. Enforces strict alarm deduplication, lifecycle transitions,
and operator acknowledgement semantics.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Literal
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


AlarmSeverity = Literal["critical", "warning", "info"]
AlarmType = Literal["process", "data_quality", "communication", "model", "scenario"]
AlarmStatus = Literal["active", "acknowledged", "resolved"]


class TwinAlarmEvent(BaseModel):
    """Authoritative digital twin alarm record."""
    alarm_id: str = Field(default_factory=lambda: str(uuid4()))
    facility_id: str
    stage_id: str
    stage_name: str
    parameter: str
    severity: AlarmSeverity
    alarm_type: AlarmType
    message: str
    observed_value: Optional[float] = None
    threshold_value: Optional[float] = None
    unit: str = "mg/L"
    acknowledged: bool = False
    first_seen_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: AlarmStatus = "active"


class AlarmManager:
    """Singleton alarm lifecycle evaluator maintaining in-memory active alarms per facility."""

    _instance: Optional["AlarmManager"] = None

    def __init__(self):
        # facility_id -> dict of alarm_key -> TwinAlarmEvent
        self._active_alarms: Dict[str, Dict[str, TwinAlarmEvent]] = {}
        # facility_id -> list of historical alarm events (bounded)
        self._alarm_history: Dict[str, List[TwinAlarmEvent]] = {}

    @classmethod
    def get_instance(cls) -> "AlarmManager":
        if cls._instance is None:
            cls._instance = AlarmManager()
        return cls._instance

    def clear(self):
        """Clear active alarms and history (test isolation)."""
        self._active_alarms.clear()
        self._alarm_history.clear()


    def _make_key(self, stage_id: str, parameter: str, alarm_type: str) -> str:
        return f"{stage_id}:{parameter}:{alarm_type}"

    def evaluate_state_alarms(
        self,
        facility_id: UUID,
        stage_states: Dict[str, Any],
        data_quality: str,
        state_freshness: str,
        is_scenario: bool = False,
    ) -> List[TwinAlarmEvent]:
        """
        Evaluates state snapshot against plant thresholds and returns the list of current active alarms.
        Deduplicates persistent conditions and resolves cleared alarms.
        """
        fac_key = str(facility_id)
        if fac_key not in self._active_alarms:
            self._active_alarms[fac_key] = {}
        if fac_key not in self._alarm_history:
            self._alarm_history[fac_key] = []

        now = datetime.now(timezone.utc)
        alarm_type: AlarmType = "scenario" if is_scenario else "process"
        current_detected_keys = set()

        # Helper to record or update an alarm
        def raise_or_update(
            stage_id: str,
            stage_name: str,
            param: str,
            severity: AlarmSeverity,
            msg: str,
            obs_val: Optional[float],
            thresh_val: Optional[float],
            unit: str,
            a_type: Optional[AlarmType] = None,
        ):
            act_type = a_type or alarm_type
            key = self._make_key(stage_id, param, act_type)
            current_detected_keys.add(key)

            existing = self._active_alarms[fac_key].get(key)
            if existing and existing.status != "resolved":
                # Update existing active alarm
                existing.last_updated_at = now
                existing.observed_value = obs_val
                existing.message = msg
                existing.severity = severity
                existing.threshold_value = thresh_val
            else:
                # Brand new alarm
                new_alarm = TwinAlarmEvent(
                    facility_id=fac_key,
                    stage_id=stage_id,
                    stage_name=stage_name,
                    parameter=param,
                    severity=severity,
                    alarm_type=act_type,
                    message=msg,
                    observed_value=obs_val,
                    threshold_value=thresh_val,
                    unit=unit,
                    acknowledged=False,
                    first_seen_at=now,
                    last_updated_at=now,
                    status="active",
                )
                self._active_alarms[fac_key][key] = new_alarm
                self._alarm_history[fac_key].append(new_alarm)
                # Keep history bounded to 200 events per facility
                if len(self._alarm_history[fac_key]) > 200:
                    self._alarm_history[fac_key] = self._alarm_history[fac_key][-200:]

        # 1. Evaluate Final Effluent CPCB Norms
        final_effluent = stage_states.get("final_effluent", {})
        if hasattr(final_effluent, "parameters"):
            final_params = final_effluent.parameters
        elif isinstance(final_effluent, dict):
            final_params = final_effluent.get("parameters", {})
        else:
            final_params = {}

        def get_val(p_obj):
            if p_obj is None:
                return None
            if hasattr(p_obj, "value"):
                val = p_obj.value
                return float(val) if val is not None else None
            if isinstance(p_obj, dict):
                val = p_obj.get("value")
                return float(val) if val is not None else None
            if isinstance(p_obj, (int, float)):
                return float(p_obj)
            return None

        def get_param(params_dict, name):
            if not isinstance(params_dict, dict):
                return None
            return params_dict.get(name.lower()) or params_dict.get(name.upper())

        bod_eff = get_val(get_param(final_params, "bod"))
        if bod_eff is not None and bod_eff > 30.0:
            raise_or_update(
                stage_id="final_effluent",
                stage_name="Final Effluent",
                param="bod",
                severity="critical",
                msg=f"Effluent BOD ({bod_eff:.1f} mg/L) exceeds CPCB discharge norm (30.0 mg/L).",
                obs_val=bod_eff,
                thresh_val=30.0,
                unit="mg/L",
            )

        cod_eff = get_val(get_param(final_params, "cod"))
        if cod_eff is not None and cod_eff > 250.0:
            raise_or_update(
                stage_id="final_effluent",
                stage_name="Final Effluent",
                param="cod",
                severity="critical",
                msg=f"Effluent COD ({cod_eff:.1f} mg/L) exceeds CPCB discharge limit (250.0 mg/L).",
                obs_val=cod_eff,
                thresh_val=250.0,
                unit="mg/L",
            )

        tss_eff = get_val(get_param(final_params, "tss"))
        if tss_eff is not None and tss_eff > 50.0:
            raise_or_update(
                stage_id="final_effluent",
                stage_name="Final Effluent",
                param="tss",
                severity="warning",
                msg=f"Effluent TSS ({tss_eff:.1f} mg/L) elevated above regulatory benchmark (50.0 mg/L).",
                obs_val=tss_eff,
                thresh_val=50.0,
                unit="mg/L",
            )

        nh4_eff = get_val(get_param(final_params, "nh4_n"))
        if nh4_eff is not None and nh4_eff > 25.0:
            raise_or_update(
                stage_id="final_effluent",
                stage_name="Final Effluent",
                param="nh4_n",
                severity="warning",
                msg=f"Effluent Ammonia ({nh4_eff:.1f} mg/L) exceeds standard nitrification limit (25.0 mg/L).",
                obs_val=nh4_eff,
                thresh_val=25.0,
                unit="mg/L",
            )

        ph_eff = get_val(get_param(final_params, "ph"))
        if ph_eff is not None and (ph_eff < 6.5 or ph_eff > 8.5):
            raise_or_update(
                stage_id="final_effluent",
                stage_name="Final Effluent",
                param="ph",
                severity="critical",
                msg=f"Effluent pH ({ph_eff:.2f}) outside safe discharge corridor (6.5 – 8.5).",
                obs_val=ph_eff,
                thresh_val=8.5 if ph_eff > 8.5 else 6.5,
                unit="pH units",
            )

        # 2. Evaluate Biological Aeration Kinetics & DO setpoint
        aeration = stage_states.get("biological_aeration", {})
        if hasattr(aeration, "operating_variables"):
            aer_ops = aeration.operating_variables
        elif isinstance(aeration, dict):
            aer_ops = aeration.get("operating_variables", {})
        else:
            aer_ops = {}

        do_val = aer_ops.get("do_mg_l") if isinstance(aer_ops, dict) else getattr(aer_ops, "do_mg_l", None)
        if do_val is not None:
            try:
                do_val = float(do_val)
            except Exception:
                pass
        if do_val is not None:
            if do_val < 1.0:
                raise_or_update(
                    stage_id="biological_aeration",
                    stage_name="Biological Aeration",
                    param="do",
                    severity="critical",
                    msg=f"Aeration basin DO crashed to {do_val:.2f} mg/L (Critical blower outage / anoxic septic risk).",
                    obs_val=do_val,
                    thresh_val=1.0,
                    unit="mg/L",
                )
            elif do_val < 2.0:
                raise_or_update(
                    stage_id="biological_aeration",
                    stage_name="Biological Aeration",
                    param="do",
                    severity="warning",
                    msg=f"Aeration basin DO at {do_val:.2f} mg/L is below optimal autotrophic nitrification setpoint (2.0 mg/L).",
                    obs_val=do_val,
                    thresh_val=2.0,
                    unit="mg/L",
                )

        # 3. Data Quality & Communications Alarms
        if data_quality == "invalid":
            raise_or_update(
                stage_id="inlet",
                stage_name="Raw Influent Inlet",
                param="sensor_quality",
                severity="critical",
                msg="Sensor observation rejected due to physical boundary or range violation.",
                obs_val=None,
                thresh_val=None,
                unit="status",
                a_type="data_quality",
            )
        elif data_quality == "suspect":
            raise_or_update(
                stage_id="inlet",
                stage_name="Raw Influent Inlet",
                param="sensor_quality",
                severity="warning",
                msg="Sensor telemetry flagged with suspect variance or calibration drift.",
                obs_val=None,
                thresh_val=None,
                unit="status",
                a_type="data_quality",
            )

        if state_freshness == "expired":
            raise_or_update(
                stage_id="inlet",
                stage_name="Raw Influent Inlet",
                param="telemetry_freshness",
                severity="critical",
                msg="Telemetry link expired: No accepted observations received in over 24 hours.",
                obs_val=None,
                thresh_val=None,
                unit="clock",
                a_type="communication",
            )

        # Auto-resolve alarms that are no longer active
        for key, alarm in list(self._active_alarms[fac_key].items()):
            if key not in current_detected_keys and alarm.status != "resolved":
                alarm.status = "resolved"
                alarm.last_updated_at = now

        return [a for a in self._active_alarms[fac_key].values() if a.status != "resolved"]

    def acknowledge_alarm(self, facility_id: UUID, alarm_id: str) -> Optional[TwinAlarmEvent]:
        """Acknowledge an active or historical alarm by ID."""
        fac_key = str(facility_id)
        if fac_key in self._active_alarms:
            for alarm in self._active_alarms[fac_key].values():
                if alarm.alarm_id == alarm_id:
                    alarm.acknowledged = True
                    alarm.status = "acknowledged"
                    alarm.last_updated_at = datetime.now(timezone.utc)
                    return alarm
        if fac_key in self._alarm_history:
            for alarm in self._alarm_history[fac_key]:
                if alarm.alarm_id == alarm_id:
                    alarm.acknowledged = True
                    alarm.status = "acknowledged"
                    alarm.last_updated_at = datetime.now(timezone.utc)
                    return alarm
        return None

    def get_active_alarms(self, facility_id: UUID) -> List[TwinAlarmEvent]:
        """Retrieve list of active alarms for a facility."""
        fac_key = str(facility_id)
        if fac_key not in self._active_alarms:
            return []
        return [a for a in self._active_alarms[fac_key].values() if a.status != "resolved"]

    def get_alarm_history(self, facility_id: UUID) -> List[TwinAlarmEvent]:
        """Retrieve bounded alarm history."""
        fac_key = str(facility_id)
        return list(self._alarm_history.get(fac_key, []))

    def clear(self, facility_id: Optional[UUID] = None) -> None:
        """Clear alarms for test isolation."""
        if facility_id:
            fac_key = str(facility_id)
            self._active_alarms.pop(fac_key, None)
            self._alarm_history.pop(fac_key, None)
        else:
            self._active_alarms.clear()
            self._alarm_history.clear()
