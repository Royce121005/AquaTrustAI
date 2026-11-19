/**
 * AquaTrust AI — Predictions API Client
 * Connects to Member 2 Phase 3 ML Treatment Quality Prediction Endpoints.
 */

import { apiClient } from './client';

export interface PredictionEvaluateRequest {
  facility_id: string;
  inlet_bod?: number;
  inlet_cod?: number;
  inlet_tss?: number;
  inlet_ph?: number;
  flow_rate_q?: number;
  lead_time_hours?: number;
}

export interface PredictedParameterDTO {
  parameter: string;
  predicted_value: number;
  unit: string;
  cpcb_discharge_limit: number;
  confidence_lower: number;
  confidence_upper: number;
  risk_level: 'COMPLIANT' | 'BORDERLINE' | 'BREACH_RISK' | string;
  risk_score: number;
  expected_removal_efficiency_pct: number;
}

export interface PredictionResponse {
  prediction_id: string;
  facility_id: string;
  treatment_stage: string;
  cycle_timestamp: string;
  horizon_hours: number;
  predicted_parameters: Record<string, PredictedParameterDTO>;
  overall_risk_status: string;
  overall_risk_score: number;
  is_cpcb_compliant: boolean;
  model_version: string;
  summary_explanation?: string | null;
  created_at: string;
}

export interface PredictionLatestResponse {
  facility_id: string;
  evaluated_at: string;
  has_prediction: boolean;
  latest_prediction?: PredictionResponse | null;
}

export async function evaluatePredictionApi(
  payload: PredictionEvaluateRequest
): Promise<PredictionResponse> {
  return apiClient<PredictionResponse>('/predictions/evaluate', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getLatestPredictionApi(
  facilityId: string
): Promise<PredictionLatestResponse> {
  return apiClient<PredictionLatestResponse>('/predictions/latest', {
    method: 'GET',
    params: { facility_id: facilityId },
  });
}
