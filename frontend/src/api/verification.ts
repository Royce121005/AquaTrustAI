import { apiClient } from './client';
import {
  Verification,
  VerifyProofRequest,
  VerifyProofResponse,
  PublicKeyResponse,
} from '../types';

export async function verifyRecordApi(recordId: string): Promise<Verification> {
  return apiClient<Verification>(`/verification/verify-record/${recordId}`, {
    method: 'POST',
  });
}

export async function verifyRecordAliasApi(recordId: string): Promise<Verification> {
  return apiClient<Verification>(`/verification/records/${recordId}`, {
    method: 'POST',
  });
}

export async function verifyRecordPublicApi(recordId: string): Promise<Verification> {
  return apiClient<Verification>(`/verification/public/verify/${recordId}`, {
    method: 'GET',
  });
}

export async function verifyCertificatePublicApi(certificateId: string): Promise<Verification> {
  return apiClient<Verification>(`/verification/public/verify-certificate/${certificateId}`, {
    method: 'GET',
  });
}

export async function verifyProofApi(payload: VerifyProofRequest): Promise<VerifyProofResponse> {
  return apiClient<VerifyProofResponse>('/verification/verify-proof', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getPublicKeyApi(keyId: string): Promise<PublicKeyResponse> {
  return apiClient<PublicKeyResponse>(`/verification/keys/${keyId}`, {
    method: 'GET',
  });
}
