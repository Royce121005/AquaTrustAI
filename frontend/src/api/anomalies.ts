import { apiClient } from './client';
import { AnomalyInferRequest, AnomalyResponse, AnomalyMetricsSummary } from '../types';

export async function inferAnomalyApi(payload: AnomalyInferRequest): Promise<AnomalyResponse> {
  return apiClient<AnomalyResponse>('/anomalies/infer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getAnomalyReportApi(readingId: string): Promise<AnomalyResponse> {
  return apiClient<AnomalyResponse>(`/anomalies/readings/${readingId}`, {
    method: 'GET',
  });
}

export async function getAnomalyMetricsApi(facilityId?: string): Promise<AnomalyMetricsSummary> {
  const query = facilityId ? `?facility_id=${encodeURIComponent(facilityId)}` : '';
  return apiClient<AnomalyMetricsSummary>(`/anomalies/metrics${query}`, {
    method: 'GET',
  });
}
