// PROVISIONAL — pending backend contract
// Ledger identifiers are fabricated; no blockchain network is connected yet.
import { delay } from './mockUtils.js'

const TX_HASH_1 = '0x9f2c44ab19d0e5b7f3c8a21e6d54bb70c93a1f27d8e64015aa2fbc39d7e4c41a'
const TX_HASH_2 = '0x1ad7be04c92f6e58a3d10cc7f84b29ee5610af38d27b9044ce63f1a85d2090e2'
const TX_HASH_3 = '0x77c3e91b50a48df26b09ce34a7d1580f96e2cb4417a6d83fb05e29ac641bd7f0'

const ANCHORED_RECORDS = [
  { id: 'REC-0001', recordType: 'sensor-batch', anchorTime: '2026-08-25T06:10:00Z', txRef: TX_HASH_1, status: 'confirmed', network: 'testnet' },
  { id: 'REC-0002', recordType: 'daily-summary', anchorTime: '2026-08-24T23:45:00Z', txRef: TX_HASH_2, status: 'pending', network: 'testnet' },
  { id: 'REC-0003', recordType: 'report', anchorTime: '2026-08-24T12:20:00Z', txRef: TX_HASH_3, status: 'confirmed', network: 'testnet' },
]

const TRANSACTIONS = {
  [TX_HASH_1]: {
    hash: TX_HASH_1,
    network: 'testnet',
    status: 'confirmed',
    blockNumber: 184203,
    anchoredAt: '2026-08-25T06:11:04Z',
    recordIds: ['REC-0001'],
  },
  [TX_HASH_2]: {
    hash: TX_HASH_2,
    network: 'testnet',
    status: 'pending',
    blockNumber: null,
    anchoredAt: null,
    recordIds: ['REC-0002'],
  },
  [TX_HASH_3]: {
    hash: TX_HASH_3,
    network: 'testnet',
    status: 'confirmed',
    blockNumber: 183971,
    anchoredAt: '2026-08-24T12:21:36Z',
    recordIds: ['REC-0003'],
  },
}

export async function getAnchoredRecords() {
  await delay()
  const records = ANCHORED_RECORDS.map((record) => ({ ...record }))
  return Promise.resolve(records)
}

export async function verifyRecord(recordId) {
  await delay(600)
  const record = ANCHORED_RECORDS.find((item) => item.id === recordId)

  if (!record) {
    return {
      recordId,
      verified: false,
      checkedAt: new Date().toISOString(),
      checks: { recordExists: false, anchoringConfirmed: false },
      message: `Record "${recordId}" not found in provisional ledger data`,
    }
  }

  return {
    recordId,
    verified: record.status === 'confirmed',
    checkedAt: new Date().toISOString(),
    checks: {
      recordExists: true,
      anchoringConfirmed: record.status === 'confirmed',
    },
    message:
      record.status === 'confirmed'
        ? 'Placeholder result: provisional checks passed'
        : 'Placeholder result: anchoring transaction is still pending',
  }
}

export async function getTransactionById(txId) {
  const transaction = TRANSACTIONS[txId]
  if (!transaction) {
    throw new Error(`Transaction "${txId}" not found`)
  }
  await delay(500)
  return { ...transaction }
}
