import { get, post } from './api';
import type { AnyRecord } from '../types';

export const getCorrectionChain = (recordId: string) => get<AnyRecord>(`/corrections/chain/${encodeURIComponent(recordId)}`);
export const proposeCorrection = (body: { original_record_id: string; reason: string; justification_code: string; corrected_parameters: AnyRecord }) => post<AnyRecord>('/corrections/propose', body);
export const authorizeCorrection = (id: string, authorizedBy: string) => post<AnyRecord>(`/corrections/${encodeURIComponent(id)}/authorize`, { authorized_by: authorizedBy });
