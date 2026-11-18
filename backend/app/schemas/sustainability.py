"""AquaTrust AI — Sustainability & Resource Optimization Pydantic Schemas."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class AerationMetricDTO(BaseModel):
    current_power_kw: float
    optimized_power_kw: float
    optimal_do_setpoint_mg_l: float
    power_reduction_kw: float
    daily_energy_saved_kwh: float
    daily_cost_saved_inr: float
    energy_reduction_pct: float
    energy_efficiency_score: float


class ChemicalMetricDTO(BaseModel):
    current_dosing_mg_l: float
    optimal_dosing_mg_l: float
    current_dosing_l_hr: float
    optimal_dosing_l_hr: float
    daily_chemical_saved_kg: float
    daily_cost_saved_inr: float
    chemical_waste_prevented_pct: float


class SustainabilityKpiDTO(BaseModel):
    water_treated_kl_day: float
    treated_water_reused_kl_day: float
    freshwater_saved_kl_day: float
    water_circularity_ratio_pct: float
    specific_energy_consumption_kwh_m3: float
    carbon_emissions_avoided_kg_co2_day: float
    pollution_load_abated_bod_kg_day: float
    overall_sustainability_index: float


class FacilityOptimizationResponse(BaseModel):
    facility_id: UUID
    timestamp: datetime
    aeration_optimization: AerationMetricDTO
    chemical_optimization: ChemicalMetricDTO
    sustainability_kpis: SustainabilityKpiDTO
    total_daily_savings_inr: float
    summary: str
    esg_verifiable_claim: str


class SustainabilitySummaryResponse(BaseModel):
    facility_id: Optional[UUID] = None
    evaluated_at: datetime
    water_treated_kl_day: float
    treated_water_reused_kl_day: float
    freshwater_saved_kl_day: float
    water_circularity_ratio_pct: float
    chemical_waste_prevented_kg_day: float
    specific_energy_consumption_kwh_m3: float
    carbon_avoided_kg_co2_day: float
    total_daily_savings_inr: float
    facilities_reporting: int
    esg_verifiable_claim: str
