import { apiClient } from './client';
import { AuditLogListResponse } from '../types';

export interface AuditEventsQuery {
  action?: string;
  resource_type?: string;
  actor_id?: string;
  skip?: number;
  limit?: number;
}

export async function listAuditEventsApi(query?: AuditEventsQuery): Promise<AuditLogListResponse> {
  return apiClient<AuditLogListResponse>('/audit-events', {
    method: 'GET',
    params: query as Record<string, string | number | undefined>,
  });
}
