import { describe, it, expect, beforeEach } from 'vitest'
import {
  addAuditEvent,
  getAuditEvent,
  getAllAuditEvents,
  processPendingBatch,
  AUDIT_ACTIONS,
  ANCHOR_STATUS,
} from './auditStore.js'
import { canonicalize, sha256Sync } from '../crypto/rfc8785.js'

describe('Central Audit Store & RFC 8785 Hash Engine', () => {
  it('computes deterministic RFC 8785 hash for identical payloads regardless of property order', () => {
    const objA = {
      tagId: 'AIT-201',
      action: 'SETPOINT_CHANGE',
      reason: 'Optimize basin DO',
      oldValue: '2.0',
      newValue: '2.5',
    }
    const objB = {
      reason: 'Optimize basin DO',
      newValue: '2.5',
      tagId: 'AIT-201',
      oldValue: '2.0',
      action: 'SETPOINT_CHANGE',
    }

    const canonA = canonicalize(objA)
    const canonB = canonicalize(objB)
    expect(canonA).toBe(canonB)

    const hashA = sha256Sync(canonA)
    const hashB = sha256Sync(canonB)
    expect(hashA).toBe(hashB)
    expect(hashA).toHaveLength(64)
  })

  it('produces completely distinct SHA-256 hash when payload changes by even 1 single byte (avalanche effect)', () => {
    const payload1 = {
      tagId: 'DP-401',
      action: 'SETPOINT_CHANGE',
      reason: 'Target residual 1.2 mg/L',
      newValue: '12.0',
    }
    const payload2 = {
      tagId: 'DP-401',
      action: 'SETPOINT_CHANGE',
      reason: 'Target residual 1.2 mg/L',
      newValue: '12.1', // 1 byte change
    }

    const hash1 = sha256Sync(canonicalize(payload1))
    const hash2 = sha256Sync(canonicalize(payload2))

    expect(hash1).not.toBe(hash2)
    expect(hash1).toHaveLength(64)
    expect(hash2).toHaveLength(64)
  })

  it('validates mandatory audit fields and throws descriptive errors on violation', () => {
    // Missing action
    expect(() =>
      addAuditEvent({
        tagId: 'BLW-201',
        reason: 'Adjusting speed',
      }),
    ).toThrow(/Invalid or missing audit action/)

    // Invalid action
    expect(() =>
      addAuditEvent({
        action: 'UNAUTHORIZED_HACK',
        tagId: 'BLW-201',
        reason: 'Adjusting speed',
      }),
    ).toThrow(/Invalid or missing audit action/)

    // Missing tagId
    expect(() =>
      addAuditEvent({
        action: AUDIT_ACTIONS.SETPOINT_CHANGE,
        reason: 'Valid reason',
      }),
    ).toThrow(/tagId is required/)

    // Missing or blank reason
    expect(() =>
      addAuditEvent({
        action: AUDIT_ACTIONS.PUMP_COMMAND,
        tagId: 'P-101',
        reason: '   ',
      }),
    ).toThrow(/Mandatory audit reason is required/)
  })

  it('adds audit event with Pending status, valid SHA-256 hash, and can be retrieved by ID', () => {
    const newEvent = addAuditEvent({
      action: AUDIT_ACTIONS.SETPOINT_CHANGE,
      tagId: 'DP-401',
      oldValue: '10.0',
      newValue: '14.5',
      reason: 'CPCB coliform reduction advisory',
      userName: 'P. Operator',
      role: 'Plant Operator',
      signatureMeaning: 'Approved',
    })

    expect(newEvent.id).toMatch(/^AUD-/)
    expect(newEvent.anchorStatus).toBe(ANCHOR_STATUS.PENDING)
    expect(newEvent.hash).toHaveLength(64)
    expect(newEvent.reason).toBe('CPCB coliform reduction advisory')

    const fetched = getAuditEvent(newEvent.id)
    expect(fetched).not.toBeNull()
    expect(fetched.id).toBe(newEvent.id)
    expect(fetched.hash).toBe(newEvent.hash)
  })

  it('correctly transitions Pending events to Anchored status upon batch anchoring', () => {
    const event = addAuditEvent({
      action: AUDIT_ACTIONS.MODE_CHANGE,
      tagId: 'BLW-201',
      oldValue: 'Manual',
      newValue: 'Auto',
      reason: 'Bumpless transfer to cascade DO control',
    })

    expect(event.anchorStatus).toBe(ANCHOR_STATUS.PENDING)

    // Run batch anchor simulation
    processPendingBatch()

    const updated = getAuditEvent(event.id)
    expect(updated.anchorStatus).toBe(ANCHOR_STATUS.ANCHORED)
    expect(updated.batchTxId).toMatch(/^tx_fabric_batch_/)
    expect(updated.anchoredAt).toBeDefined()
  })
})
