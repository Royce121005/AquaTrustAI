import { apiClient } from './client';
import {
  DLTStatus,
  DLTAnchor,
  DLTReconcileResponse,
  DLTBatchAnchorRequest,
  DLTBatchAnchorResponse,
  DLTBatchVerifyRequest,
  DLTBatchVerifyResponse,
} from '../types';

export interface DLTAnchorsQuery {
  facility_id?: string;
  anchor_status?: string;
  skip?: number;
  limit?: number;
}

export async function getDLTStatusApi(): Promise<DLTStatus> {
  return apiClient<DLTStatus>('/dlt/status', {
    method: 'GET',
  });
}

export async function listDLTAnchorsApi(query?: DLTAnchorsQuery): Promise<DLTAnchor[]> {
  return apiClient<DLTAnchor[]>('/dlt/anchors', {
    method: 'GET',
    params: query as Record<string, string | number | undefined>,
  });
}

export async function reconcileAnchorApi(recordId: string): Promise<DLTReconcileResponse> {
  return apiClient<DLTReconcileResponse>(`/dlt/anchors/${recordId}/reconcile`, {
    method: 'POST',
  });
}

export async function getAnchorByHashApi(canonicalHash: string): Promise<DLTAnchor> {
  return apiClient<DLTAnchor>(`/dlt/anchors/hash/${canonicalHash}`, {
    method: 'GET',
  });
}

export async function getLedgerRecordApi(recordId: string): Promise<Record<string, unknown>> {
  return apiClient<Record<string, unknown>>(`/dlt/ledger/records/${recordId}`, {
    method: 'GET',
  });
}

export async function getLedgerHistoryApi(recordId: string): Promise<{
  record_id: string;
  mode: string;
  distributed_ledger: boolean;
  history: Array<Record<string, unknown>>;
}> {
  return apiClient<{
    record_id: string;
    mode: string;
    distributed_ledger: boolean;
    history: Array<Record<string, unknown>>;
  }>(`/dlt/ledger/history/${recordId}`, {
    method: 'GET',
  });
}

export async function getRecordBatchApi(recordId: string): Promise<Record<string, unknown>> {
  return apiClient<Record<string, unknown>>(`/dlt/batches/records/${recordId}`, {
    method: 'GET',
  });
}

export async function anchorBatchApi(payload: DLTBatchAnchorRequest): Promise<DLTBatchAnchorResponse> {
  return apiClient<DLTBatchAnchorResponse>('/dlt/batch-anchor', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyBatchLeafApi(payload: DLTBatchVerifyRequest): Promise<DLTBatchVerifyResponse> {
  return apiClient<DLTBatchVerifyResponse>('/dlt/batch-verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getDLTTransactionApi(txId: string): Promise<Record<string, unknown>> {
  return apiClient<Record<string, unknown>>(`/dlt/transactions/${txId}`, {
    method: 'GET',
  });
}
