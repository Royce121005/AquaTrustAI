import { apiClient } from './client';
import { ValidationResponse, ValidationStatsResponse } from '../types';

export async function getValidationStatsApi(facilityId?: string): Promise<ValidationStatsResponse> {
  return apiClient<ValidationStatsResponse>('/validation/stats', {
    method: 'GET',
    params: facilityId ? { facility_id: facilityId } : undefined,
  });
}

export async function runValidationApi(readingId: string): Promise<ValidationResponse> {
  return apiClient<ValidationResponse>(`/validation/readings/${readingId}`, {
    method: 'POST',
  });
}

export async function getValidationReportApi(readingId: string): Promise<ValidationResponse> {
  return apiClient<ValidationResponse>(`/validation/readings/${readingId}`, {
    method: 'GET',
  });
}
