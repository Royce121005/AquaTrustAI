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

export async function getAnomalyMetricsApi(): Promise<AnomalyMetricsSummary> {
  return apiClient<AnomalyMetricsSummary>('/anomalies/metrics', {
    method: 'GET',
  });
}
