import { apiClient } from './client';
import {
  ComplianceRule,
  ComplianceEvaluateResponse,
  ComplianceSummaryResponse,
} from '../types';

export async function getComplianceRulesApi(): Promise<ComplianceRule[]> {
  return apiClient<ComplianceRule[]>('/compliance/rules', {
    method: 'GET',
  });
}

export async function evaluateComplianceApi(treatmentRecordId: string): Promise<ComplianceEvaluateResponse> {
  return apiClient<ComplianceEvaluateResponse>('/compliance/evaluate', {
    method: 'POST',
    body: JSON.stringify({ treatment_record_id: treatmentRecordId }),
  });
}

export async function getComplianceSummaryApi(): Promise<ComplianceSummaryResponse> {
  return apiClient<ComplianceSummaryResponse>('/compliance/summary', {
    method: 'GET',
  });
}
