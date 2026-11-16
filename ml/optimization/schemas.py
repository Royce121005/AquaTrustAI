"""
AquaTrust AI — Sustainability & Resource Optimization Schemas (Phase 5)
Defines standard data structures for optimizing blower energy, chemical dosing,
and calculating verifiable sustainability KPIs (Freshwater Saved, Carbon Avoided, Circularity).
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Optional, Any, Union
from datetime import datetime


@dataclass
class ResourceOptimizationInput:
    """
    Input operating data for treatment plant resource optimization.
    """
    facility_id: str
    timestamp: Union[str, datetime]
    inflow_rate_m3_day: float                    # Total hydraulic inflow Q (m3/day or kL/day)
    inlet_bod: float                             # mg/L
    inlet_cod: float                             # mg/L
    inlet_tss: float                             # mg/L
    inlet_tkn: Optional[float] = 35.0            # mg/L Total Kjeldahl Nitrogen
    effluent_bod: Optional[float] = 18.0         # mg/L (from measurement or Phase 3 prediction)
    effluent_cod: Optional[float] = 85.0         # mg/L
    effluent_tss: Optional[float] = 20.0         # mg/L
    reused_flow_rate_m3_day: Optional[float] = 0.0 # Treated effluent diverted to non-potable reuse
    current_blower_power_kw: Optional[float] = 55.0 # Installed / measured blower power consumption
    current_pac_dosing_l_hr: Optional[float] = 25.0 # Current coagulant dosing pump rate
    electricity_tariff_inr_kwh: float = 8.0      # Commercial electricity cost (₹ / kWh)
    coagulant_cost_inr_kg: float = 22.0          # Commercial PAC coagulant cost (₹ / kg)
    grid_emission_factor_kg_co2_kwh: float = 0.82 # CEA India Grid emission factor
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not self.facility_id:
            raise ValueError("facility_id must be provided.")
        if isinstance(self.timestamp, datetime):
            self.timestamp = self.timestamp.isoformat()
        elif not isinstance(self.timestamp, str):
            raise ValueError("timestamp must be an ISO-8601 string or datetime object.")

        self.inflow_rate_m3_day = float(self.inflow_rate_m3_day)
        self.inlet_bod = float(self.inlet_bod)
        self.inlet_cod = float(self.inlet_cod)
        self.inlet_tss = float(self.inlet_tss)
        if self.inlet_tkn is not None:
            self.inlet_tkn = float(self.inlet_tkn)
        if self.reused_flow_rate_m3_day is not None:
            self.reused_flow_rate_m3_day = float(self.reused_flow_rate_m3_day)


@dataclass
class AerationOptimizationResult:
    """Quantitative blower energy reduction metrics."""
    current_power_kw: float
    optimized_power_kw: float
    optimal_do_setpoint_mg_l: float
    power_reduction_kw: float
    daily_energy_saved_kwh: float
    daily_cost_saved_inr: float
    energy_reduction_pct: float
    energy_efficiency_score: float  # 0 to 100

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ChemicalOptimizationResult:
    """Quantitative coagulant dosing optimization metrics."""
    current_dosing_mg_l: float
    optimal_dosing_mg_l: float
    current_dosing_l_hr: float
    optimal_dosing_l_hr: float
    daily_chemical_saved_kg: float
    daily_cost_saved_inr: float
    specific_chemical_intensity_g_m3: float
    chemical_waste_prevented_pct: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SustainabilityKpiResult:
    """Verifiable environmental and circular economy impact metrics."""
    water_treated_kl_day: float
    treated_water_reused_kl_day: float
    freshwater_saved_kl_day: float                # Spared groundwater / municipal potable water
    water_circularity_ratio_pct: float            # (Reused / Treated) * 100
    specific_energy_consumption_kwh_m3: float     # Plant electrical intensity (benchmark 0.3 - 0.5)
    carbon_emissions_avoided_kg_co2_day: float    # Scope 2 carbon offset from energy & avoided pumping
    pollution_load_abated_bod_kg_day: float       # Organic waste prevented from entering rivers
    pollution_load_abated_cod_kg_day: float
    pollution_load_abated_tss_kg_day: float
    overall_sustainability_index: float           # 0 to 100 composite sustainability score

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ResourceOptimizationOutput:
    """
    Unified contract delivered by Member 1 to Member 2 (Backend) and Member 3 (Frontend).
    """
    facility_id: str
    timestamp: str
    aeration_optimization: AerationOptimizationResult
    chemical_optimization: ChemicalOptimizationResult
    sustainability_kpis: SustainabilityKpiResult
    total_daily_savings_inr: float
    summary: str
    esg_verifiable_claim: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "facility_id": self.facility_id,
            "timestamp": self.timestamp,
            "aeration_optimization": self.aeration_optimization.to_dict(),
            "chemical_optimization": self.chemical_optimization.to_dict(),
            "sustainability_kpis": self.sustainability_kpis.to_dict(),
            "total_daily_savings_inr": self.total_daily_savings_inr,
            "summary": self.summary,
            "esg_verifiable_claim": self.esg_verifiable_claim,
        }
