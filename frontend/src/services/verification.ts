import { get, post } from './api';
import type { AnyRecord } from '../types';

export const verifyTreatmentRecord = (recordId: string) => post<AnyRecord>(`/verification/verify-record/${encodeURIComponent(recordId)}`, {});
export const verifyPublicCertificate = (certificateId: string) => get<AnyRecord>(`/verification/public/verify-certificate/${encodeURIComponent(certificateId)}`, false);
