/**
 * AquaTrust AI — Sustainability & Resource Optimization API Client
 * Connects to Member 2 Phase 5 Sustainability Endpoints.
 */

import { apiClient } from './client';

export interface AerationMetricDTO {
  current_power_kw: number;
  optimized_power_kw: number;
  optimal_do_setpoint_mg_l: number;
  power_reduction_kw: number;
  daily_energy_saved_kwh: number;
  daily_cost_saved_inr: number;
  energy_reduction_pct: number;
  energy_efficiency_score: number;
}

export interface ChemicalMetricDTO {
  current_dosing_mg_l: number;
  optimal_dosing_mg_l: number;
  current_dosing_l_hr: number;
  optimal_dosing_l_hr: number;
  daily_chemical_saved_kg: number;
  daily_cost_saved_inr: number;
  chemical_waste_prevented_pct: number;
}

export interface SustainabilityKpiDTO {
  water_treated_kl_day: number;
  treated_water_reused_kl_day: number;
  freshwater_saved_kl_day: number;
  water_circularity_ratio_pct: number;
  specific_energy_consumption_kwh_m3: number;
  carbon_emissions_avoided_kg_co2_day: number;
  pollution_load_abated_bod_kg_day: number;
  overall_sustainability_index: number;
}

export interface FacilityOptimizationResponse {
  facility_id: string;
  timestamp: string;
  aeration_optimization: AerationMetricDTO;
  chemical_optimization: ChemicalMetricDTO;
  sustainability_kpis: SustainabilityKpiDTO;
  total_daily_savings_inr: number;
  summary: string;
  esg_verifiable_claim: string;
}

export interface SustainabilitySummaryResponse {
  facility_id?: string | null;
  evaluated_at: string;
  water_treated_kl_day: number;
  treated_water_reused_kl_day: number;
  freshwater_saved_kl_day: number;
  water_circularity_ratio_pct: number;
  chemical_waste_prevented_kg_day: number;
  specific_energy_consumption_kwh_m3: number;
  carbon_avoided_kg_co2_day: number;
  total_daily_savings_inr: number;
  facilities_reporting: number;
  esg_verifiable_claim: string;
}

export async function getSustainabilitySummaryApi(
  facilityId?: string
): Promise<SustainabilitySummaryResponse> {
  return apiClient<SustainabilitySummaryResponse>('/sustainability/summary', {
    method: 'GET',
    params: facilityId ? { facility_id: facilityId } : undefined,
  });
}

export async function getFacilityOptimizationApi(
  facilityId: string,
  flowOverride?: number,
  reuseOverride?: number
): Promise<FacilityOptimizationResponse> {
  return apiClient<FacilityOptimizationResponse>(`/sustainability/optimize/${facilityId}`, {
    method: 'GET',
    params: {
      flow_rate_override: flowOverride,
      reuse_rate_override: reuseOverride,
    },
  });
}
