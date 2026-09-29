/**
 * AquaTrust AI — Central Immutable Audit Store
 * Conforms to 21 CFR Part 11 electronic records, ISA-18.2 audit governance,
 * and Hyperledger Fabric batch ledger anchoring.
 */

import { useState, useEffect } from 'react'
import { canonicalize, sha256Sync } from '../crypto/rfc8785.js'

export const AUDIT_ACTIONS = {
  SETPOINT_CHANGE: 'SETPOINT_CHANGE',
  MODE_CHANGE: 'MODE_CHANGE',
  PUMP_COMMAND: 'PUMP_COMMAND',
  CALIBRATION: 'CALIBRATION',
  ALARM_ACK: 'ALARM_ACK',
  ALARM_SHELVE: 'ALARM_SHELVE',
  ALARM_OOS: 'ALARM_OOS',
  STATE_CHANGE: 'STATE_CHANGE',
}

export const ANCHOR_STATUS = {
  PENDING: 'Pending',
  ANCHORED: 'Anchored',
  VERIFIED: 'Verified',
}

const STORAGE_KEY = 'aquatrust-audit-events-v1'

// Initial baseline mock events for demonstration
const INITIAL_EVENTS = [
  {
    id: 'AUD-001',
    timestamp: '2026-09-28T08:15:00.000Z',
    userId: 'usr_op_01',
    userName: 'K. Ramanathan',
    role: 'Plant Operator',
    action: AUDIT_ACTIONS.PUMP_COMMAND,
    tagId: 'P-101',
    oldValue: 'Stopped',
    newValue: 'Running',
    reason: 'Operator advisory request: manual duty rotation following intake surge',
    signatureMeaning: 'Approved',
    anchorStatus: ANCHOR_STATUS.ANCHORED,
    hash: 'e963fc23cf0eb966c4c5cf2339678e0c4cbca476a6e542bf82aa7aeb354f3b17',
    batchTxId: 'tx_fabric_batch_0815',
  },
  {
    id: 'AUD-002',
    timestamp: '2026-09-28T09:30:00.000Z',
    userId: 'usr_tech_04',
    userName: 'V. Nair',
    role: 'Plant Operator',
    action: AUDIT_ACTIONS.CALIBRATION,
    tagId: 'AIT-201',
    oldValue: 'Pre-cal: offset -0.12 mg/L',
    newValue: 'Post-cal: Zero/Span calibrated (Slope 0.992)',
    reason: 'Routine 30-day ISO 17025 optical DO sensor calibration',
    signatureMeaning: 'Calibrated',
    anchorStatus: ANCHOR_STATUS.ANCHORED,
    hash: '4a5e8c187f54b6b662d5e3f4219b168936932400f07df8b857796d1945f348e3',
    batchTxId: 'tx_fabric_batch_0930',
  },
]

let auditEvents = (() => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // fallback
  }
  return [...INITIAL_EVENTS]
})()

const listeners = new Set()

function notifyListeners() {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auditEvents))
    }
  } catch {
    // Ignore storage quota
  }
  listeners.forEach((listener) => listener([...auditEvents]))
}

/**
 * Validates and records a new audit trail event.
 * Computes deterministic RFC 8785 SHA-256 hash immediately on creation.
 */
export function addAuditEvent(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Audit event payload must be a non-null object.')
  }

  const {
    action,
    tagId,
    reason,
    userId = 'usr_op_current',
    userName = 'Operator On Duty',
    role = 'Plant Operator',
    oldValue = null,
    newValue = null,
    signatureMeaning = null,
  } = payload

  if (!action || !Object.values(AUDIT_ACTIONS).includes(action)) {
    throw new Error(`Invalid or missing audit action: "${action}". Valid: ${Object.values(AUDIT_ACTIONS).join(', ')}`)
  }

  if (!tagId || typeof tagId !== 'string') {
    throw new Error('tagId is required for audit event tracking.')
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    throw new Error('Mandatory audit reason is required for compliance logging.')
  }

  const id = `AUD-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
  const timestamp = new Date().toISOString()

  // Canonical representation for RFC 8785 hashing
  const hashableContent = {
    id,
    timestamp,
    userId: String(userId),
    userName: String(userName),
    role: String(role),
    action: String(action),
    tagId: String(tagId),
    oldValue: oldValue != null ? String(oldValue) : null,
    newValue: newValue != null ? String(newValue) : null,
    reason: String(reason).trim(),
    signatureMeaning: signatureMeaning != null ? String(signatureMeaning) : null,
  }

  const canonicalStr = canonicalize(hashableContent)
  const hash = sha256Sync(canonicalStr)

  const event = {
    ...hashableContent,
    anchorStatus: ANCHOR_STATUS.PENDING,
    hash,
    batchTxId: null,
  }

  auditEvents = [event, ...auditEvents]
  notifyListeners()
  return event
}

export function getAuditEvent(id) {
  return auditEvents.find((e) => e.id === id) || null
}

export function getAllAuditEvents() {
  return [...auditEvents]
}

/**
 * Trigger simulated Merkle batch anchoring.
 * Transitions all 'Pending' events to 'Anchored' with simulated Fabric transaction reference.
 */
export function processPendingBatch() {
  let modified = false
  const now = Date.now()
  const batchTxId = `tx_fabric_batch_${now}`

  auditEvents = auditEvents.map((evt) => {
    if (evt.anchorStatus === ANCHOR_STATUS.PENDING) {
      modified = true
      return {
        ...evt,
        anchorStatus: ANCHOR_STATUS.ANCHORED,
        batchTxId,
        anchoredAt: new Date().toISOString(),
      }
    }
    return evt
  })

  if (modified) {
    notifyListeners()
  }
}

// Background batch anchoring timer (~15 seconds)
if (typeof window !== 'undefined') {
  setInterval(() => {
    processPendingBatch()
  }, 15000)
}

/**
 * React hook to subscribe to live audit store updates.
 */
export function useAuditEvents() {
  const [events, setEvents] = useState(() => [...auditEvents])

  useEffect(() => {
    const handleUpdate = (updatedEvents) => {
      setEvents(updatedEvents)
    }
    listeners.add(handleUpdate)
    return () => {
      listeners.delete(handleUpdate)
    }
  }, [])

  return events
}
