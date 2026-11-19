/**
 * AquaTrust AI — Recommendations API Client
 * Connects to Member 2 Phase 4 Prescriptive Process Recommendations Endpoints.
 */

import { apiClient } from './client';

export interface ParameterTargetDTO {
  parameter: string;
  current_value?: number | null;
  recommended_setpoint: number;
  unit: string;
  adjustment_delta: number;
}

export interface RecommendationResponse {
  recommendation_id: string;
  facility_id: string;
  timestamp: string;
  title: string;
  action: string;
  category: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | string;
  urgency: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW' | string;
  related_parameter: string;
  trigger_source: string;
  reason?: string | null;
  parameter_target?: ParameterTargetDTO | null;
  estimated_impact?: string | null;
  status: 'ACTIVE' | 'APPLIED' | 'DISMISSED' | string;
  applied_at?: string | null;
  applied_by?: string | null;
  created_at: string;
}

export interface RecommendationApplyRequest {
  setpoint_applied?: number | null;
  operator_notes?: string | null;
}

export interface RecommendationListResponse {
  facility_id: string;
  total_count: number;
  active_count: number;
  critical_count: number;
  recommendations: RecommendationResponse[];
}

export async function getActiveRecommendationsApi(
  facilityId: string
): Promise<RecommendationListResponse> {
  return apiClient<RecommendationListResponse>('/recommendations/active', {
    method: 'GET',
    params: { facility_id: facilityId },
  });
}

export async function getRecommendationHistoryApi(
  facilityId: string,
  skip?: number,
  limit?: number
): Promise<RecommendationListResponse> {
  return apiClient<RecommendationListResponse>('/recommendations/history', {
    method: 'GET',
    params: {
      facility_id: facilityId,
      skip,
      limit,
    },
  });
}

export async function applyRecommendationApi(
  id: string,
  payload?: RecommendationApplyRequest
): Promise<RecommendationResponse> {
  return apiClient<RecommendationResponse>(`/recommendations/${id}/apply`, {
    method: 'POST',
    body: payload ? JSON.stringify(payload) : JSON.stringify({}),
    headers: { 'Content-Type': 'application/json' },
  });
}
