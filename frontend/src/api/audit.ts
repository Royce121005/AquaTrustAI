/**
 * AquaTrust AI — Audit Log & Timeline API Client
 */

import { apiClient } from './client';
import { AuditLogListResponse } from '../types';

export interface AuditEventsQuery {
  action?: string;
  resource_type?: string;
  actor_id?: string;
  skip?: number;
  limit?: number;
}

export interface AuditTimelineItem {
  audit_log_id: string;
  timestamp: string;
  category: string;
  action: string;
  actor_id?: string | null;
  actor_role?: string | null;
  resource_type: string;
  resource_id?: string | null;
  outcome: string;
  summary: string;
  details?: Record<string, unknown> | null;
}

export interface AuditTimelineResponse {
  facility_id?: string | null;
  total_events: number;
  timeline: AuditTimelineItem[];
}

export interface AuditTimelineQuery {
  facility_id?: string;
  from_date?: string;
  to_date?: string;
  category?: string;
  limit?: number;
}

export async function listAuditEventsApi(query?: AuditEventsQuery): Promise<AuditLogListResponse> {
  return apiClient<AuditLogListResponse>('/audit-events', {
    method: 'GET',
    params: query as Record<string, string | number | undefined>,
  });
}

export async function getAuditTimelineApi(query?: AuditTimelineQuery): Promise<AuditTimelineResponse> {
  return apiClient<AuditTimelineResponse>('/audit/timeline', {
    method: 'GET',
    params: query as Record<string, string | number | undefined>,
  });
}
