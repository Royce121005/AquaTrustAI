// FastAPI implementation seam — endpoint paths are intentionally TBD until the
// backend ledger/verification contract arrives. Keep verifyRecord resolving
// (never throwing) for unknown IDs, matching the current frontend contract.
import { notImplementedError } from '../apiErrors.js'

export function getAnchoredRecords() {
  return Promise.reject(notImplementedError('getAnchoredRecords'))
}

export function verifyRecord() {
  return Promise.reject(notImplementedError('verifyRecord'))
}

export function getTransactionById() {
  return Promise.reject(notImplementedError('getTransactionById'))
}
