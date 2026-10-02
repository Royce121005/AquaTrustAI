import { get, post, q } from './api';
import type { Anchor, AnyRecord } from '../types';

export const getDltStatus = () => get<AnyRecord>('/dlt/status');
export const listAnchors = (limit = 50) => get<Anchor[]>(`/dlt/anchors${q({ limit })}`);
export const reconcileAnchor = (recordId: string) => post<AnyRecord>(`/dlt/anchors/${encodeURIComponent(recordId)}/reconcile`, {});
export const anchorBatch = (body: { record_hashes: string[]; record_ids: string[]; facility_id: string }) => post<AnyRecord>('/dlt/batch-anchor', body);
export const getRecordBatch = (recordId: string) => get<AnyRecord>(`/dlt/batches/records/${encodeURIComponent(recordId)}`);
export const verifyBatchLeaf = (batchId: string, leafHash: string) => post<AnyRecord>('/dlt/batch-verify', { batch_id: batchId, leaf_hash: leafHash });
export const getLedgerHistory = (recordId: string) => get<AnyRecord>(`/dlt/ledger/history/${encodeURIComponent(recordId)}`);
export const getTransaction = (txId: string) => get<AnyRecord>(`/dlt/transactions/${encodeURIComponent(txId)}`);
