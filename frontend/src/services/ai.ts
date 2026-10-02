import { get } from './api';
import type { AnyRecord } from '../types';

export type AnomalyMetrics = { total_inferences: number; anomalies_detected: number; anomaly_rate_percent: number; model_version: string; recent_events: AnyRecord[] };
export const getAnomalyMetrics = () => get<AnomalyMetrics>('/anomalies/metrics');
export const getAnomalyForReading = (readingId: string) => get<AnyRecord>(`/anomalies/readings/${encodeURIComponent(readingId)}`);
