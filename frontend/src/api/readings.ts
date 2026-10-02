import { apiClient } from './client';
import {
  Reading,
  ReadingIngestRequest,
  ReadingIngestResponse,
  BatchIngestResponse,
} from '../types';

export interface ReadingsQuery {
  facility_id?: string;
  parameter?: string;
  start_time?: string;
  end_time?: string;
  quality_status?: string;
  skip?: number;
  limit?: number;
}

export async function listReadingsApi(query?: ReadingsQuery): Promise<Reading[]> {
  return apiClient<Reading[]>('/readings', {
    method: 'GET',
    params: query as Record<string, string | number | undefined>,
  });
}

export async function getReadingApi(readingId: string): Promise<Reading> {
  return apiClient<Reading>(`/readings/${readingId}`, {
    method: 'GET',
  });
}

export async function ingestReadingApi(payload: ReadingIngestRequest): Promise<ReadingIngestResponse> {
  return apiClient<ReadingIngestResponse>('/ingestion/readings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function ingestBatchApi(payload: {
  facility_id: string;
  readings: ReadingIngestRequest[];
  batch_id?: string;
}): Promise<BatchIngestResponse> {
  return apiClient<BatchIngestResponse>('/ingestion/batch', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
