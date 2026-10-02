import { get, post, q } from './api';
import type { AnyRecord, TreatmentRecord } from '../types';

export const listTreatmentRecords = (limit = 50) => get<TreatmentRecord[]>(`/treatment-records${q({ limit })}`);
export const getTreatmentRecord = (id: string) => get<TreatmentRecord>(`/treatment-records/${encodeURIComponent(id)}`);
export const finalizeTreatmentRecord = (body: { facility_id: string; period_start: string; period_end: string }) => post<TreatmentRecord>('/treatment-records/finalize', body);
export const listCertificates = (limit = 50) => get<AnyRecord[]>(`/certificates${q({ limit })}`);
