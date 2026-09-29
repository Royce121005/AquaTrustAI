import { describe, it, expect, beforeEach } from 'vitest'
import {
  ALARM_STATES,
  ALARM_PRIORITIES,
  createAlarmRecord,
  evaluateTagAlarm,
  acknowledgeAlarm,
  shelveAlarm,
  outOfServiceAlarm,
  returnToService,
  detectChattering,
  detectStale,
  CHATTERING_WINDOW_MS,
  STALE_THRESHOLD_MS,
} from './alarmStateMachine.js'

describe('ISA-18.2 Alarm State Machine', () => {
  const mockMeta = {
    name: 'Aeration Basin DO',
    unit: 'mg/L',
    alarmLimits: { LL: 1.2, L: 1.8, H: 4.5, HH: 5.5 },
  }

  let record

  beforeEach(() => {
    record = createAlarmRecord('AIT-201', mockMeta)
  })

  it('1. Initializes in Normal state with proper metadata', () => {
    expect(record.state).toBe(ALARM_STATES.NORMAL)
    expect(record.tagId).toBe('AIT-201')
    expect(record.limitCrossed).toBeNull()
  })

  it('2. Transitions from Normal to Unack-Active when H or HH limit breached', () => {
    const now = 100000
    // Test Warning (H = 4.5)
    let updated = evaluateTagAlarm(record, 4.8, mockMeta, now)
    expect(updated.state).toBe(ALARM_STATES.UNACK_ACTIVE)
    expect(updated.priority).toBe(ALARM_PRIORITIES.WARNING)
    expect(updated.limitCrossed).toBe('H')
    expect(updated.timeIn).toBe(now)

    // Test Critical (HH = 5.5)
    let critRecord = createAlarmRecord('AIT-201', mockMeta)
    updated = evaluateTagAlarm(critRecord, 5.8, mockMeta, now)
    expect(updated.state).toBe(ALARM_STATES.UNACK_ACTIVE)
    expect(updated.priority).toBe(ALARM_PRIORITIES.CRITICAL)
    expect(updated.limitCrossed).toBe('HH')
  })

  it('3. Transitions from Unack-Active to Ack-Active on operator ACK', () => {
    const t0 = 100000
    let tripped = evaluateTagAlarm(record, 5.8, mockMeta, t0)
    expect(tripped.state).toBe(ALARM_STATES.UNACK_ACTIVE)

    const t1 = 105000
    let acked = acknowledgeAlarm(tripped, 'Chief Operator', 'Checked blower speed', t1)
    expect(acked.state).toBe(ALARM_STATES.ACK_ACTIVE)
    expect(acked.timeAck).toBe(t1)
    expect(acked.ackBy).toBe('Chief Operator')
  })

  it('4. Transitions from Ack-Active to Normal when value returns to safe band', () => {
    const t0 = 100000
    let tripped = evaluateTagAlarm(record, 5.8, mockMeta, t0)
    let acked = acknowledgeAlarm(tripped, 'Operator', 'Acked', t0 + 2000)
    
    // Value returns to normal 2.5 mg/L
    let cleared = evaluateTagAlarm(acked, 2.5, mockMeta, t0 + 10000)
    expect(cleared.state).toBe(ALARM_STATES.NORMAL)
    expect(cleared.limitCrossed).toBeNull()
  })

  it('5. Transitions from Unack-Active to Unack-RTN if cleared before ACK', () => {
    const t0 = 100000
    let tripped = evaluateTagAlarm(record, 5.8, mockMeta, t0)
    
    // Value drops to normal without operator ACK
    let rtn = evaluateTagAlarm(tripped, 2.5, mockMeta, t0 + 5000)
    expect(rtn.state).toBe(ALARM_STATES.UNACK_RTN)
    expect(rtn.timeRtn).toBe(t0 + 5000)

    // When operator acknowledges Unack-RTN, it moves to Normal
    let cleared = acknowledgeAlarm(rtn, 'Operator', 'Excursion cleared', t0 + 8000)
    expect(cleared.state).toBe(ALARM_STATES.NORMAL)
  })

  it('6. Shelves alarm with mandatory reason and auto-expires on time', () => {
    const t0 = 100000
    let tripped = evaluateTagAlarm(record, 5.8, mockMeta, t0)
    
    // Shelve for 15 minutes
    let shelved = shelveAlarm(tripped, 15, 'Sensor probe cleaning in progress', 'Technician A', t0)
    expect(shelved.state).toBe(ALARM_STATES.SHELVED)
    expect(shelved.shelveReason).toBe('Sensor probe cleaning in progress')
    expect(shelved.shelveUntil).toBe(t0 + 15 * 60 * 1000)

    // During shelved window, evaluation remains Shelved even if limit breached
    let stillShelved = evaluateTagAlarm(shelved, 6.0, mockMeta, t0 + 5 * 60 * 1000)
    expect(stillShelved.state).toBe(ALARM_STATES.SHELVED)

    // After expiry, evaluation un-shelves alarm
    let expired = evaluateTagAlarm(shelved, 6.0, mockMeta, t0 + 16 * 60 * 1000)
    expect(expired.state).toBe(ALARM_STATES.UNACK_ACTIVE)
  })

  it('7. Rejects shelving without valid justification', () => {
    expect(() => {
      shelveAlarm(record, 10, '')
    }).toThrow('Mandatory justification reason required')
  })

  it('8. Puts alarm Out-of-Service and returns to service', () => {
    const t0 = 100000
    let oos = outOfServiceAlarm(record, 'Blower overhaul scheduled', 'Lead Tech', t0)
    expect(oos.state).toBe(ALARM_STATES.OUT_OF_SERVICE)
    expect(oos.oosReason).toBe('Blower overhaul scheduled')

    // Evaluator skips OOS alarms
    let evalOos = evaluateTagAlarm(oos, 7.5, mockMeta, t0 + 1000)
    expect(evalOos.state).toBe(ALARM_STATES.OUT_OF_SERVICE)

    // Return to service
    let activeAgain = returnToService(evalOos, 'Lead Tech', t0 + 2000)
    expect(activeAgain.state).toBe(ALARM_STATES.NORMAL)
    expect(activeAgain.oosReason).toBeNull()
  })

  it('9. Detects chattering alarms (>= 3 transitions in 60s)', () => {
    const t0 = 100000
    let rec = { ...record, history: [t0 - 30000, t0 - 20000, t0 - 5000] }
    expect(detectChattering(rec, t0)).toBe(true)

    // Spread apart (> 60s)
    let spreadRec = { ...record, history: [t0 - 120000, t0 - 90000, t0 - 10000] }
    expect(detectChattering(spreadRec, t0)).toBe(false)
  })

  it('10. Detects stale alarms (> 24 hours unacknowledged)', () => {
    const t0 = 100000
    let tripped = evaluateTagAlarm(record, 5.8, mockMeta, t0)
    
    // Check 2 hours later -> not stale
    expect(detectStale(tripped, t0 + 2 * 3600 * 1000)).toBe(false)

    // Check 25 hours later -> stale
    expect(detectStale(tripped, t0 + 25 * 3600 * 1000)).toBe(true)
  })
})
