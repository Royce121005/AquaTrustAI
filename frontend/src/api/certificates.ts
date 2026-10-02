import { apiClient } from './client';
import { Certificate } from '../types';

export interface CertificatesQuery {
  facility_id?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

export async function listCertificatesApi(query?: CertificatesQuery): Promise<Certificate[]> {
  return apiClient<Certificate[]>('/certificates', {
    method: 'GET',
    params: query as Record<string, string | number | undefined>,
  });
}

export async function getCertificateApi(certificateId: string): Promise<Certificate> {
  return apiClient<Certificate>(`/certificates/${certificateId}`, {
    method: 'GET',
  });
}

export async function getCertificateByRecordApi(recordId: string): Promise<Certificate> {
  return apiClient<Certificate>(`/certificates/record/${recordId}`, {
    method: 'GET',
  });
}
