import { get, q } from './api';
import type { AnyRecord } from '../types';

export type AuditEventsResponse = { total_count: number; logs: AnyRecord[] };
export const listAuditEvents = (limit = 50) => get<AuditEventsResponse>(`/audit-events${q({ limit })}`);
