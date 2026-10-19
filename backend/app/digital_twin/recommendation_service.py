"""AquaTrust AI — Advisory Process Recommendation Service.

Generates constraint-checked operational recommendations derived from virtual state,
data-quality anomalies, and what-if scenario outcomes.
Enforces the strict invariant: ADVISORY ONLY — NO AUTONOMOUS ACTUATOR CONTROL.
Conforms to Section 12.2 of Digital Twin Implementation Blueprint.
"""

from typing import Dict, Any, List, Optional
from uuid import UUID, uuid4
from sqlalchemy.orm import Session

from app.db.base import utc_now
from app.models.digital_twin import TwinRecommendation, TwinState, TwinScenario
from app.digital_twin.repository import TwinRepository


class RecommendationService:
    """Advisory decision-support engine generating actionable operator recommendations."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = TwinRepository(db)

    def evaluate_facility_state(
        self,
        facility_id: UUID,
        scenario_id: Optional[UUID] = None,
    ) -> List[TwinRecommendation]:
        """
        Evaluates facility virtual state and active scenarios to derive advisory recommendations.
        """
        latest_state = self.repo.get_latest_state(facility_id)
        if not latest_state:
            return []

        recommendations: List[TwinRecommendation] = []
        obs = latest_state.latest_observations or {}
        sensors = latest_state.sensor_states or {}

        # 1. Check Data Quality / Sensor Rejection
        rejected_sensors = [
            k for k, v in sensors.items()
            if isinstance(v, dict) and v.get("quality_status") == "invalid"
        ]
        if rejected_sensors or latest_state.data_quality == "invalid":
            rec = TwinRecommendation(
                recommendation_id=uuid4(),
                facility_id=facility_id,
                scenario_id=scenario_id,
                recommendation_type="sensor_calibration_check",
                priority="urgent",
                evidence=[
                    f"Sensor '{s}' emitted out-of-bounds or rejected observation"
                    for s in rejected_sensors
                ] or ["Facility data quality is currently marked invalid."],
                suggested_action="Perform physical inspection, cleaning, and recalibration of rejected sensor probe(s). Verify wiring and analog 4-20mA loop integrity.",
                expected_outcome="Restores reliable telemetry ingestion and resets virtual plant data-quality to valid status.",
                limitations=[
                    "System does not perform automated hardware reset.",
                    "On-site physical inspection is required before clearing flag.",
                ],
                requires_human_review=True,
                status="active",
                created_at=utc_now(),
            )
            recommendations.append(self.repo.create_recommendation(rec))

        # 2. Check Stale Telemetry
        if latest_state.state_freshness in ("stale", "expired"):
            rec = TwinRecommendation(
                recommendation_id=uuid4(),
                facility_id=facility_id,
                scenario_id=scenario_id,
                recommendation_type="telemetry_connectivity_investigation",
                priority="warning",
                evidence=[
                    f"Virtual state freshness is '{latest_state.state_freshness}'. "
                    f"Last accepted observation was at {latest_state.last_accepted_observation_at}."
                ],
                suggested_action="Verify edge gateway power, cellular/Ethernet backhaul connectivity, and local PLC transmission buffer.",
                expected_outcome="Resumes real-time state tracking and eliminates reliance on retained historical values.",
                limitations=[
                    "Process model is currently running on stale inputs.",
                    "Model outputs during stale intervals have higher uncertainty.",
                ],
                requires_human_review=True,
                status="active",
                created_at=utc_now(),
            )
            recommendations.append(self.repo.create_recommendation(rec))

        # 3. Check Elevated Ammonia / Nitrification Deficit
        nh4_obs = obs.get("nh4_n", {}).get("value")
        if nh4_obs is not None and float(nh4_obs) > 25.0:
            rec = TwinRecommendation(
                recommendation_id=uuid4(),
                facility_id=facility_id,
                scenario_id=scenario_id,
                recommendation_type="aeration_nitrification_review",
                priority="review",
                evidence=[
                    f"Effluent/biological NH4-N concentration is elevated at {nh4_obs} mg/L (threshold: 25 mg/L)."
                ],
                suggested_action="Review aeration basin dissolved oxygen (DO) setpoint. If DO < 2.0 mg/L, verify blower operating frequency and diffuser bubble patterns. Inspect influent alkalinity.",
                expected_outcome="Promotes autotrophic nitrifier activity and reduces effluent ammonia to regulatory compliance limits (< 50 mg/L).",
                limitations=[
                    "No autonomous blower speed or valve adjustment is performed.",
                    "Process kinetics assume sufficient alkalinity for nitrification buffering.",
                ],
                requires_human_review=True,
                status="active",
                created_at=utc_now(),
            )
            recommendations.append(self.repo.create_recommendation(rec))

        # 4. Check What-If Scenario Overrides (if scenario_id provided)
        if scenario_id:
            scenario = self.repo.get_scenario(scenario_id)
            if scenario and scenario.status == "completed":
                results = self.repo.get_scenario_results(scenario_id)
                high_risk = [r for r in results if r.estimated_compliance_status == "non_compliant"]
                if high_risk:
                    params_at_risk = sorted(list(set(r.parameter.upper() for r in high_risk)))
                    rec = TwinRecommendation(
                        recommendation_id=uuid4(),
                        facility_id=facility_id,
                        scenario_id=scenario_id,
                        recommendation_type="scenario_contingency_preparation",
                        priority="review",
                        evidence=[
                            f"What-If scenario '{scenario.scenario_name}' indicates non-compliance risk for: {params_at_risk}."
                        ],
                        suggested_action=f"Prepare contingency SOPs for {scenario.scenario_type.replace('_', ' ')}. Evaluate equalization tank storage or emergency chemical coagulant dosing.",
                        expected_outcome="Mitigates potential regulatory discharge violations under simulated operating stress.",
                        limitations=[
                            "Scenario simulation is hypothetical and does not alter live plant equipment settings.",
                        ],
                        requires_human_review=True,
                        status="active",
                        created_at=utc_now(),
                    )
                    recommendations.append(self.repo.create_recommendation(rec))

        return recommendations
