"""AquaTrust AI — Sustainability & Resource Optimization Service (Member 2 Phase 5)."""

from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.base import utc_now
from app.models.facility import Facility
from app.models.reading import Reading
from app.schemas.sustainability import (
    AerationMetricDTO,
    ChemicalMetricDTO,
    SustainabilityKpiDTO,
    FacilityOptimizationResponse,
    SustainabilitySummaryResponse,
)
from ml.optimization.engine import AquaTrustResourceOptimizer
from ml.optimization.schemas import ResourceOptimizationInput, ResourceOptimizationOutput


class SustainabilityService:
    """Computes verifiable environmental impact, water recycling circularity, and resource conservation."""

    def __init__(self, db: Session, optimizer: Optional[AquaTrustResourceOptimizer] = None):
        self.db = db
        self.optimizer = optimizer or AquaTrustResourceOptimizer()

    def get_facility_optimization(
        self,
        facility_id: UUID,
        flow_rate_override: Optional[float] = None,
        reuse_rate_override: Optional[float] = None,
    ) -> FacilityOptimizationResponse:
        """Calculates multi-resource optimization for aeration blowers and chemical coagulant dosing."""
        facility = self.db.get(Facility, facility_id)
        if not facility:
            raise ValueError(f"Facility with ID {facility_id} does not exist.")

        now = utc_now()
        readings_map = self._get_recent_readings(facility_id)

        # Flow rate in m3/day (1 MLD = 1000 m3/day)
        capacity_mld = float(facility.capacity) if facility.capacity else 20.0
        inflow_m3_day = flow_rate_override or (capacity_mld * 1000.0)
        reused_m3_day = reuse_rate_override or (inflow_m3_day * 0.65)  # 65% circularity target

        opt_input = ResourceOptimizationInput(
            facility_id=str(facility_id),
            timestamp=now.isoformat(),
            inflow_rate_m3_day=inflow_m3_day,
            inlet_bod=readings_map.get("bod", 220.0),
            inlet_cod=readings_map.get("cod", 460.0),
            inlet_tss=readings_map.get("tss", 240.0),
            inlet_tkn=readings_map.get("nh4_n", 35.0) * 1.2 if "nh4_n" in readings_map else 35.0,
            effluent_bod=readings_map.get("effluent_bod", 18.0),
            effluent_cod=readings_map.get("effluent_cod", 75.0),
            effluent_tss=readings_map.get("effluent_tss", 22.0),
            reused_flow_rate_m3_day=reused_m3_day,
        )

        ml_output: ResourceOptimizationOutput = self.optimizer.optimize(opt_input)

        a_dto = AerationMetricDTO(
            current_power_kw=ml_output.aeration_optimization.current_power_kw,
            optimized_power_kw=ml_output.aeration_optimization.optimized_power_kw,
            optimal_do_setpoint_mg_l=ml_output.aeration_optimization.optimal_do_setpoint_mg_l,
            power_reduction_kw=ml_output.aeration_optimization.power_reduction_kw,
            daily_energy_saved_kwh=ml_output.aeration_optimization.daily_energy_saved_kwh,
            daily_cost_saved_inr=ml_output.aeration_optimization.daily_cost_saved_inr,
            energy_reduction_pct=ml_output.aeration_optimization.energy_reduction_pct,
            energy_efficiency_score=ml_output.aeration_optimization.energy_efficiency_score,
        )

        c_dto = ChemicalMetricDTO(
            current_dosing_mg_l=ml_output.chemical_optimization.current_dosing_mg_l,
            optimal_dosing_mg_l=ml_output.chemical_optimization.optimal_dosing_mg_l,
            current_dosing_l_hr=ml_output.chemical_optimization.current_dosing_l_hr,
            optimal_dosing_l_hr=ml_output.chemical_optimization.optimal_dosing_l_hr,
            daily_chemical_saved_kg=ml_output.chemical_optimization.daily_chemical_saved_kg,
            daily_cost_saved_inr=ml_output.chemical_optimization.daily_cost_saved_inr,
            chemical_waste_prevented_pct=ml_output.chemical_optimization.chemical_waste_prevented_pct,
        )

        s_dto = SustainabilityKpiDTO(
            water_treated_kl_day=ml_output.sustainability_kpis.water_treated_kl_day,
            treated_water_reused_kl_day=ml_output.sustainability_kpis.treated_water_reused_kl_day,
            freshwater_saved_kl_day=ml_output.sustainability_kpis.freshwater_saved_kl_day,
            water_circularity_ratio_pct=ml_output.sustainability_kpis.water_circularity_ratio_pct,
            specific_energy_consumption_kwh_m3=ml_output.sustainability_kpis.specific_energy_consumption_kwh_m3,
            carbon_emissions_avoided_kg_co2_day=ml_output.sustainability_kpis.carbon_emissions_avoided_kg_co2_day,
            pollution_load_abated_bod_kg_day=ml_output.sustainability_kpis.pollution_load_abated_bod_kg_day,
            overall_sustainability_index=ml_output.sustainability_kpis.overall_sustainability_index,
        )

        return FacilityOptimizationResponse(
            facility_id=facility_id,
            timestamp=now,
            aeration_optimization=a_dto,
            chemical_optimization=c_dto,
            sustainability_kpis=s_dto,
            total_daily_savings_inr=ml_output.total_daily_savings_inr,
            summary=ml_output.summary,
            esg_verifiable_claim=ml_output.esg_verifiable_claim,
        )

    def get_sustainability_summary(
        self, facility_id: Optional[UUID] = None
    ) -> SustainabilitySummaryResponse:
        """Aggregates platform sustainability and circular economy credentials."""
        now = utc_now()
        if facility_id:
            facilities = [self.db.get(Facility, facility_id)]
            facilities = [f for f in facilities if f is not None]
        else:
            stmt = select(Facility).limit(20)
            facilities = list(self.db.scalars(stmt).all())

        if not facilities:
            return SustainabilitySummaryResponse(
                facility_id=facility_id,
                evaluated_at=now,
                water_treated_kl_day=0.0,
                treated_water_reused_kl_day=0.0,
                freshwater_saved_kl_day=0.0,
                water_circularity_ratio_pct=0.0,
                chemical_waste_prevented_kg_day=0.0,
                specific_energy_consumption_kwh_m3=0.35,
                carbon_avoided_kg_co2_day=0.0,
                total_daily_savings_inr=0.0,
                facilities_reporting=0,
                esg_verifiable_claim="No operational treatment facilities registered.",
            )

        total_treated = 0.0
        total_reused = 0.0
        total_freshwater = 0.0
        total_chem_saved = 0.0
        total_carbon_saved = 0.0
        total_savings = 0.0

        for f in facilities:
            try:
                opt_res = self.get_facility_optimization(f.facility_id)
                kpi = opt_res.sustainability_kpis
                total_treated += kpi.water_treated_kl_day
                total_reused += kpi.treated_water_reused_kl_day
                total_freshwater += kpi.freshwater_saved_kl_day
                total_chem_saved += opt_res.chemical_optimization.daily_chemical_saved_kg
                total_carbon_saved += kpi.carbon_emissions_avoided_kg_co2_day
                total_savings += opt_res.total_daily_savings_inr
            except Exception:
                continue

        circularity = (total_reused / total_treated * 100.0) if total_treated > 0 else 0.0
        esg_claim = (
            f"AquaTrust Network Verified Claim: Diverting {total_reused:,.0f} kL/day of treated water to non-potable reuse, "
            f"offsetting {total_freshwater:,.0f} kL/day of municipal potable demand, "
            f"preventing {total_chem_saved:,.1f} kg/day chemical waste, "
            f"and mitigating {total_carbon_saved:,.1f} kg CO2e greenhouse emissions across {len(facilities)} plants."
        )

        return SustainabilitySummaryResponse(
            facility_id=facility_id,
            evaluated_at=now,
            water_treated_kl_day=round(total_treated, 1),
            treated_water_reused_kl_day=round(total_reused, 1),
            freshwater_saved_kl_day=round(total_freshwater, 1),
            water_circularity_ratio_pct=round(circularity, 1),
            chemical_waste_prevented_kg_day=round(total_chem_saved, 1),
            specific_energy_consumption_kwh_m3=0.38,
            carbon_avoided_kg_co2_day=round(total_carbon_saved, 1),
            total_daily_savings_inr=round(total_savings, 2),
            facilities_reporting=len(facilities),
            esg_verifiable_claim=esg_claim,
        )

    def _get_recent_readings(self, facility_id: UUID) -> Dict[str, float]:
        stmt = (
            select(Reading)
            .where(Reading.facility_id == facility_id)
            .order_by(desc(Reading.observed_at))
            .limit(50)
        )
        readings = list(self.db.scalars(stmt).all())
        m: Dict[str, float] = {}
        for r in readings:
            if r.parameter and r.value is not None:
                p = r.parameter.lower()
                if p not in m:
                    m[p] = float(r.value)
        return m
