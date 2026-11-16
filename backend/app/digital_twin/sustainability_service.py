"""AquaTrust AI — Sustainability & Water Reuse Accounting Service.

Computes wastewater recycling volume, freshwater substitution displacement,
and safe reuse suitability gating according to Section 13 of the Digital Twin Blueprint.
"""

from typing import Dict, Any, Optional
from decimal import Decimal
from uuid import UUID
from sqlalchemy.orm import Session

from app.db.base import utc_now
from app.digital_twin.repository import TwinRepository


class SustainabilityService:
    """Calculates sustainability impact metrics and reuse suitability gates."""

    # Default freshwater substitution fraction (industrial / landscaping reuse)
    DEFAULT_SUBSTITUTION_FRACTION = 0.85

    # Safe Reuse Standards (CPCB / WHO Guidelines for Urban Reuse)
    REUSE_QUALITY_THRESHOLDS = {
        "bod": 10.0,      # mg/L for unrestricted urban / industrial reuse
        "tss": 10.0,      # mg/L
        "ph_min": 6.5,
        "ph_max": 8.5,
        "nh4_n": 5.0,     # mg/L
    }

    def __init__(self, db: Session):
        self.db = db
        self.repo = TwinRepository(db)

    def calculate_sustainability_metrics(
        self,
        facility_id: UUID,
        daily_treated_flow_m3: Optional[float] = None,
        reuse_fraction: float = 0.60,
        substitution_fraction: Optional[float] = None,
        daily_energy_kwh: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Calculates treated reuse volume, displaced freshwater, energy intensity,
        and evaluates safe reuse gating criteria.
        """
        latest_state = self.repo.get_latest_state(facility_id)
        if not latest_state:
            return {"status": "insufficient_data", "reason": "No virtual plant state found."}

        obs = latest_state.latest_observations or {}
        config = self.repo.get_active_configuration(facility_id)

        # Determine flow rate
        if daily_treated_flow_m3 is None:
            # Check config operating variables
            design_mld = (
                config.operating_variables.get("design_capacity_mld", 10.0)
                if config and config.operating_variables
                else 10.0
            )
            # 1 MLD = 1000 m3/day
            daily_flow = float(design_mld) * 1000.0
            flow_source = "simulated_nominal"
        else:
            daily_flow = float(daily_treated_flow_m3)
            flow_source = "measured"

        f_sub = substitution_fraction or self.DEFAULT_SUBSTITUTION_FRACTION
        v_reuse = daily_flow * reuse_fraction
        v_displaced = v_reuse * f_sub

        # Energy intensity calculation if energy input is provided
        energy_metrics = None
        if daily_energy_kwh is not None and daily_flow > 0:
            kwh_per_m3 = daily_energy_kwh / daily_flow
            energy_metrics = {
                "daily_energy_consumption_kwh": round(daily_energy_kwh, 2),
                "energy_intensity_kwh_per_m3": round(kwh_per_m3, 3),
                "data_source": "metered",
            }
        else:
            energy_metrics = {
                "energy_intensity_kwh_per_m3": None,
                "status": "unavailable",
                "reason": "Direct energy metering telemetry is not currently connected.",
            }

        # -------------------------------------------------------------
        # Safe Reuse Gate (Section 13.4)
        # -------------------------------------------------------------
        # Invariant: NEVER declare safe for reuse based on predicted values alone!
        # Requires valid observations and all parameters within reuse thresholds.
        gate_passed = True
        gate_reasons = []

        if latest_state.data_quality != "valid":
            gate_passed = False
            gate_reasons.append(f"Data quality is '{latest_state.data_quality}' (must be 'valid').")

        if latest_state.state_freshness != "fresh":
            gate_passed = False
            gate_reasons.append(f"State freshness is '{latest_state.state_freshness}' (must be 'fresh').")

        for param, limit in self.REUSE_QUALITY_THRESHOLDS.items():
            if param.startswith("ph_"):
                continue
            p_obs = obs.get(param, {}).get("value")
            if p_obs is None:
                gate_passed = False
                gate_reasons.append(f"Mandatory parameter '{param.upper()}' observation is missing.")
            elif float(p_obs) > limit:
                gate_passed = False
                gate_reasons.append(
                    f"Observed {param.upper()} ({p_obs} mg/L) exceeds safe reuse threshold ({limit} mg/L)."
                )

        ph_obs = obs.get("ph", {}).get("value")
        if ph_obs is not None:
            if float(ph_obs) < self.REUSE_QUALITY_THRESHOLDS["ph_min"] or float(ph_obs) > self.REUSE_QUALITY_THRESHOLDS["ph_max"]:
                gate_passed = False
                gate_reasons.append(
                    f"Observed pH ({ph_obs}) falls outside safe reuse range "
                    f"({self.REUSE_QUALITY_THRESHOLDS['ph_min']} - {self.REUSE_QUALITY_THRESHOLDS['ph_max']})."
                )

        return {
            "facility_id": str(facility_id),
            "state_version": latest_state.state_version,
            "period": "daily",
            "evaluated_at": utc_now().isoformat(),
            "capacity_mld": round(daily_flow / 1000.0, 2),
            "treated_flow_m3_day": round(daily_flow, 1),
            "flow_data_source": flow_source,
            "reuse_volume_m3_day": round(v_reuse, 1),
            "reuse_fraction": reuse_fraction,
            "estimated_freshwater_displacement_m3_day": round(v_displaced, 1),
            "freshwater_displacement_m3_day": round(v_displaced, 1),
            "annual_freshwater_saved_m3": round(v_displaced * 365.0, 1),
            "substitution_fraction": f_sub,
            "energy_accounting": energy_metrics,
            "safe_reuse_gate": "PASSED" if gate_passed else "HELD",
            "safe_reuse_eligible": gate_passed,
            "safe_reuse_gate_details": {
                "is_suitable_for_reuse_review": gate_passed,
                "reasons": gate_reasons if not gate_passed else ["All parameters satisfy safe reuse thresholds."],
                "limitations": [
                    "Advisory evaluation only.",
                    "Does not substitute for certified statutory laboratory microbiological testing (e.g. fecal coliform).",
                ],
                "requires_authorized_review": True,
            },
            "reuse_applications": [
                "Urban Landscape & Parks Irrigation",
                "Industrial Cooling Tower Make-Up Water",
                "Construction & Dust Suppression",
                "Toilet & Urinal Flushing (Dual Plumbing)",
            ] if gate_passed else [
                "Requires additional polishing & regulatory verification prior to reuse approval",
            ],
            "effluent_quality_summary": {
                "bod": obs.get("bod", {}).get("value"),
                "cod": obs.get("cod", {}).get("value"),
                "tss": obs.get("tss", {}).get("value"),
                "ph": obs.get("ph", {}).get("value"),
                "data_quality": latest_state.data_quality,
            },
        }
