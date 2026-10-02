import { apiClient } from './client';
import {
  Correction,
  CorrectionChainResponse,
  ProposeCorrectionRequest,
  AuthorizeCorrectionRequest,
} from '../types';

export async function proposeCorrectionApi(payload: ProposeCorrectionRequest): Promise<Correction> {
  return apiClient<Correction>('/corrections/propose', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function authorizeCorrectionApi(
  correctionId: string,
  payload: AuthorizeCorrectionRequest
): Promise<Correction> {
  return apiClient<Correction>(`/corrections/${correctionId}/authorize`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getCorrectionChainApi(recordId: string): Promise<CorrectionChainResponse> {
  return apiClient<CorrectionChainResponse>(`/corrections/chain/${recordId}`, {
    method: 'GET',
  });
}
