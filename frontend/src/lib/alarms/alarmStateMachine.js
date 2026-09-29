/**
 * AquaTrust AI — ISA-18.2 Alarm State Machine & Lifecycle Management
 * Pure TypeScript/ESM module conforming to ISA-18.2 and EEMUA 191 standards.
 * 
 * Implements 8 standard alarm states:
 * - Normal: Process value in safe band, no active alarm.
 * - Unack-Active: Limit breached, unacknowledged by operator.
 * - Ack-Active: Limit breached, acknowledged by operator.
 * - Unack-RTN: Process returned to normal (RTN), but trip unacknowledged.
 * - Ack-RTN: Excursion acknowledged after RTN (transitions to Normal).
 * - Shelved: Temporarily paused by operator with reason and mandatory expiry.
 * - Suppressed: Suppressed by engineered logic or interlock.
 * - Out-of-Service: Removed from operational scanning for maintenance.
 */

import { addAuditEvent } from '../audit/auditStore.js'

export const ALARM_STATES = {
  NORMAL: 'Normal',
  UNACK_ACTIVE: 'Unack-Active',
  ACK_ACTIVE: 'Ack-Active',
  UNACK_RTN: 'Unack-RTN',
  ACK_RTN: 'Ack-RTN',
  SHELVED: 'Shelved',
  SUPPRESSED: 'Suppressed',
  OUT_OF_SERVICE: 'Out-of-Service',
}

export const ALARM_PRIORITIES = {
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
  INFO: 'INFO',
}

// 60 seconds window for chattering detection (>= 3 transitions)
export const CHATTERING_WINDOW_MS = 60 * 1000
export const CHATTERING_THRESHOLD = 3

// 24 hours threshold for stale alarms
export const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000

/**
 * Creates a fresh alarm record for a tag.
 */
export function createAlarmRecord(tagId, tagMeta = {}) {
  return {
    tagId,
    name: tagMeta.name || tagId,
    description: tagMeta.description || '',
    unit: tagMeta.unit || '',
    priority: ALARM_PRIORITIES.INFO,
    state: ALARM_STATES.NORMAL,
    limitCrossed: null, // 'LL' | 'L' | 'H' | 'HH' | null
    limitValue: null,
    tripValue: null,
    timeIn: null,
    timeAck: null,
    timeRtn: null,
    ackBy: null,
    shelveReason: null,
    shelveUntil: null,
    oosReason: null,
    isChattering: false,
    isStale: false,
    history: [], // Transition timestamps
    responseProcedure: tagMeta.responseProcedure || 'Inspect instrument and verify process conditions.',
  }
}

/**
 * Checks if the alarm is chattering (>= 3 state changes in 60s).
 */
export function detectChattering(alarmRecord, now = Date.now()) {
  const cutoff = now - CHATTERING_WINDOW_MS
  const recentTransitions = alarmRecord.history.filter((ts) => ts >= cutoff)
  return recentTransitions.length >= CHATTERING_THRESHOLD
}

/**
 * Checks if the alarm is stale (> 24h unacknowledged in an active state).
 */
export function detectStale(alarmRecord, now = Date.now()) {
  if (
    (alarmRecord.state === ALARM_STATES.UNACK_ACTIVE || alarmRecord.state === ALARM_STATES.UNACK_RTN) &&
    alarmRecord.timeIn &&
    now - alarmRecord.timeIn > STALE_THRESHOLD_MS
  ) {
    return true
  }
  return false
}

/**
 * Evaluates live tag value against LL, L, H, HH limits and updates state.
 * Returns a new updated alarm record (pure function).
 */
export function evaluateTagAlarm(record, liveValue, tagMeta = {}, now = Date.now()) {
  const current = { ...record }
  const limits = tagMeta.alarmLimits || {}
  const { LL, L, H, HH } = limits

  // Check Shelve Expiry first
  if (current.state === ALARM_STATES.SHELVED) {
    if (current.shelveUntil && now >= current.shelveUntil) {
      current.state = ALARM_STATES.NORMAL
      current.shelveReason = null
      current.shelveUntil = null
    } else {
      // Still shelved: suppress evaluation
      return current
    }
  }

  // If Out of Service or Suppressed, do not trip
  if (current.state === ALARM_STATES.OUT_OF_SERVICE || current.state === ALARM_STATES.SUPPRESSED) {
    return current
  }

  // Determine if value violates limits
  let crossedLimit = null
  let crossedPriority = ALARM_PRIORITIES.INFO
  let limitVal = null

  if (typeof LL === 'number' && liveValue <= LL) {
    crossedLimit = 'LL'
    crossedPriority = ALARM_PRIORITIES.CRITICAL
    limitVal = LL
  } else if (typeof HH === 'number' && liveValue >= HH) {
    crossedLimit = 'HH'
    crossedPriority = ALARM_PRIORITIES.CRITICAL
    limitVal = HH
  } else if (typeof L === 'number' && liveValue <= L) {
    crossedLimit = 'L'
    crossedPriority = ALARM_PRIORITIES.WARNING
    limitVal = L
  } else if (typeof H === 'number' && liveValue >= H) {
    crossedLimit = 'H'
    crossedPriority = ALARM_PRIORITIES.WARNING
    limitVal = H
  }

  const isTripped = crossedLimit !== null
  const prevState = current.state
  let nextState = prevState

  if (isTripped) {
    current.priority = crossedPriority
    current.limitCrossed = crossedLimit
    current.limitValue = limitVal
    current.tripValue = liveValue

    if (prevState === ALARM_STATES.NORMAL || prevState === ALARM_STATES.ACK_RTN) {
      nextState = ALARM_STATES.UNACK_ACTIVE
      current.timeIn = now
      current.timeAck = null
      current.timeRtn = null
    } else if (prevState === ALARM_STATES.UNACK_RTN) {
      // Re-tripped before ACK
      nextState = ALARM_STATES.UNACK_ACTIVE
    }
  } else {
    // Return To Normal (RTN) condition
    if (prevState === ALARM_STATES.UNACK_ACTIVE) {
      nextState = ALARM_STATES.UNACK_RTN
      current.timeRtn = now
    } else if (prevState === ALARM_STATES.ACK_ACTIVE) {
      // Acknowledged and now back in band -> auto clears to Normal
      nextState = ALARM_STATES.NORMAL
      current.timeRtn = now
      current.limitCrossed = null
      current.limitValue = null
      current.tripValue = null
    }
  }

  // Log transition timestamp if state changed
  if (nextState !== prevState) {
    current.state = nextState
    current.history = [...(current.history || []), now]
  }

  // Update chattering & stale flags
  current.isChattering = detectChattering(current, now)
  current.isStale = detectStale(current, now)

  return current
}

/**
 * Acknowledges an active or RTN alarm.
 */
export function acknowledgeAlarm(record, operator = 'Plant Operator', reason = 'Acknowledged by operator', now = Date.now()) {
  const current = { ...record }
  const prevState = current.state
  let nextState = prevState

  if (prevState === ALARM_STATES.UNACK_ACTIVE) {
    nextState = ALARM_STATES.ACK_ACTIVE
    current.timeAck = now
    current.ackBy = operator
  } else if (prevState === ALARM_STATES.UNACK_RTN) {
    nextState = ALARM_STATES.NORMAL
    current.timeAck = now
    current.ackBy = operator
    current.limitCrossed = null
    current.limitValue = null
    current.tripValue = null
  } else {
    // Already acked or normal
    return current
  }

  current.state = nextState
  current.history = [...(current.history || []), now]
  current.isChattering = detectChattering(current, now)
  current.isStale = false

  // Emit 21 CFR Part 11 Audit Event
  try {
    addAuditEvent({
      action: 'ALARM_ACK',
      tagId: current.tagId,
      oldValue: prevState,
      newValue: nextState,
      reason: `Operator request (advisory): ${reason}`,
      userName: operator,
      role: 'Plant Operator',
      details: {
        limitCrossed: current.limitCrossed,
        priority: current.priority,
        tripValue: current.tripValue,
      },
    })
  } catch (err) {
    console.error('Audit event failed for alarm ack:', err)
  }

  return current
}

/**
 * Shelves an alarm with required reason and expiry timestamp.
 */
export function shelveAlarm(record, durationMinutes, reason, operator = 'Plant Operator', now = Date.now()) {
  if (!reason || reason.trim().length < 3) {
    throw new Error('Mandatory justification reason required to shelve alarm.')
  }
  if (!durationMinutes || durationMinutes <= 0) {
    throw new Error('Valid shelve duration required.')
  }

  const current = { ...record }
  const prevState = current.state
  const shelveUntil = now + durationMinutes * 60 * 1000

  current.state = ALARM_STATES.SHELVED
  current.shelveReason = reason.trim()
  current.shelveUntil = shelveUntil
  current.history = [...(current.history || []), now]
  current.isChattering = false
  current.isStale = false

  try {
    addAuditEvent({
      action: 'ALARM_SHELVE',
      tagId: current.tagId,
      oldValue: prevState,
      newValue: ALARM_STATES.SHELVED,
      reason: `Operator request (advisory): Shelved for ${durationMinutes}m - ${reason}`,
      userName: operator,
      role: 'Plant Operator',
      details: {
        shelveDurationMinutes: durationMinutes,
        shelveUntil: new Date(shelveUntil).toISOString(),
      },
    })
  } catch (err) {
    console.error('Audit event failed for alarm shelve:', err)
  }

  return current
}

/**
 * Places an alarm Out-of-Service for scheduled maintenance.
 */
export function outOfServiceAlarm(record, reason, operator = 'Plant Operator', now = Date.now()) {
  if (!reason || reason.trim().length < 3) {
    throw new Error('Mandatory justification reason required for Out-of-Service.')
  }

  const current = { ...record }
  const prevState = current.state

  current.state = ALARM_STATES.OUT_OF_SERVICE
  current.oosReason = reason.trim()
  current.history = [...(current.history || []), now]
  current.isChattering = false
  current.isStale = false

  try {
    addAuditEvent({
      action: 'ALARM_OOS',
      tagId: current.tagId,
      oldValue: prevState,
      newValue: ALARM_STATES.OUT_OF_SERVICE,
      reason: `Operator request (advisory): Placed Out-of-Service - ${reason}`,
      userName: operator,
      role: 'Plant Operator',
      details: {
        oosReason: reason,
      },
    })
  } catch (err) {
    console.error('Audit event failed for alarm OOS:', err)
  }

  return current
}

/**
 * Returns an Out-of-Service or Shelved alarm back to active operational scanning.
 */
export function returnToService(record, operator = 'Plant Operator', now = Date.now()) {
  const current = { ...record }
  const prevState = current.state

  current.state = ALARM_STATES.NORMAL
  current.oosReason = null
  current.shelveReason = null
  current.shelveUntil = null
  current.history = [...(current.history || []), now]

  try {
    addAuditEvent({
      action: 'STATE_CHANGE',
      tagId: current.tagId,
      oldValue: prevState,
      newValue: ALARM_STATES.NORMAL,
      reason: 'Operator request (advisory): Returned alarm to operational scanning',
      userName: operator,
      role: 'Plant Operator',
    })
  } catch (err) {
    console.error('Audit event failed for return to service:', err)
  }

  return current
}
