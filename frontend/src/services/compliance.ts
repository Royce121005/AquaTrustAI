import { get, post } from './api';
import type { AnyRecord } from '../types';

export type ComplianceSummary = { total_evaluations: number; compliant_count: number; non_compliant_count: number; compliance_rate_percent: number; cpcb_standard_version: string; recent_evaluations: AnyRecord[] };
export const getComplianceSummary = () => get<ComplianceSummary>('/compliance/summary');
export const getComplianceRules = () => get<AnyRecord[]>('/compliance/rules');
export const evaluateTreatmentRecord = (treatment_record_id: string) => post<AnyRecord>('/compliance/evaluate', { treatment_record_id });
