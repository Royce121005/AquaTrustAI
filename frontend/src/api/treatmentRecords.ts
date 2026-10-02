import { apiClient } from './client';
import { TreatmentRecord, TreatmentRecordFinalizeRequest } from '../types';

export interface TreatmentRecordsQuery {
  facility_id?: string;
  record_state?: string;
  compliance_status?: string;
  skip?: number;
  limit?: number;
}

export async function listTreatmentRecordsApi(query?: TreatmentRecordsQuery): Promise<TreatmentRecord[]> {
  return apiClient<TreatmentRecord[]>('/treatment-records', {
    method: 'GET',
    params: query as Record<string, string | number | undefined>,
  });
}

export async function getTreatmentRecordApi(recordId: string): Promise<TreatmentRecord> {
  return apiClient<TreatmentRecord>(`/treatment-records/${recordId}`, {
    method: 'GET',
  });
}

export async function finalizeTreatmentRecordApi(
  payload: TreatmentRecordFinalizeRequest
): Promise<TreatmentRecord> {
  return apiClient<TreatmentRecord>('/treatment-records/finalize', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
