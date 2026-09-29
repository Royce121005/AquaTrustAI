/**
 * AquaTrust AI — Sensor Calibration Lifecycle & Metrology Store
 * Conforms to ISO/IEC 17025 laboratory calibration standards,
 * EPA Good Laboratory Practice (GLP), and CPCB continuous analyzer protocols.
 */

import { useState, useEffect } from 'react'
import { addAuditEvent, AUDIT_ACTIONS } from '../audit/auditStore.js'

export const CALIBRATION_METHODS = {
  ZERO_SPAN: 'Zero/Span',
  MULTI_POINT: 'Multi-Point Buffer (pH 4/7/10)',
}

export const CALIBRATION_STATUS = {
  VALID: 'VALID',
  HOLD: 'HOLD',
  DUE: 'DUE',
  OVERDUE: 'OVERDUE',
  FAILED: 'FAILED',
}

/**
 * Standard linear regression for multi-point sensor calibration (e.g. pH 4, 7, 10 buffers).
 * Expected = x, Measured = y.
 * Computes slope m and offset b where Measured = m * Expected + b.
 * Pass criteria: |slope - 1.0| * 100 <= tolerancePct.
 */
export function computeMultiPointCalibration(points, tolerancePct = 5.0) {
  if (!Array.isArray(points) || points.length < 2) {
    throw new Error('At least 2 calibration points are required for regression.')
  }

  const n = points.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (const pt of points) {
    const x = Number(pt.expected)
    const y = Number(pt.measured)
    if (Number.isNaN(x) || Number.isNaN(y)) {
      throw new Error('All calibration point values must be valid numbers.')
    }
    sumX += x
    sumY += y
    sumXY += x * y
    sumX2 += x * x
  }

  const denominator = n * sumX2 - sumX * sumX
  if (Math.abs(denominator) < 1e-9) {
    throw new Error('Points have identical expected values; cannot compute slope.')
  }

  const slope = (n * sumXY - sumX * sumY) / denominator
  const offset = (sumY - slope * sumX) / n
  const slopeErrorPct = Math.abs(slope - 1.0) * 100
  const passed = slopeErrorPct <= tolerancePct && Math.abs(offset) <= 0.5

  return {
    slope: +slope.toFixed(4),
    offset: +offset.toFixed(4),
    slopeErrorPct: +slopeErrorPct.toFixed(2),
    passed,
  }
}

/**
 * Two-point Zero/Span calibration calculation (e.g., Optical DO 0 mg/L sodium sulfite zero, air sat span).
 * Pass criteria: Slope within 1.0 ± (tolerancePct / 100) and Zero Offset within tolerance.
 */
export function computeZeroSpanCalibration({
  zeroExpected = 0,
  zeroMeasured,
  spanExpected,
  spanMeasured,
  tolerancePct = 5.0,
}) {
  const zExp = Number(zeroExpected)
  const zMeas = Number(zeroMeasured)
  const sExp = Number(spanExpected)
  const sMeas = Number(spanMeasured)

  if (
    Number.isNaN(zExp) ||
    Number.isNaN(zMeas) ||
    Number.isNaN(sExp) ||
    Number.isNaN(sMeas)
  ) {
    throw new Error('All zero and span readings must be finite numbers.')
  }

  const deltaExpected = sExp - zExp
  if (Math.abs(deltaExpected) < 1e-9) {
    throw new Error('Zero and span expected values cannot be identical.')
  }

  const offset = +(zMeas - zExp).toFixed(4)
  const slope = +((sMeas - zMeas) / deltaExpected).toFixed(4)
  const slopeErrorPct = +(Math.abs(slope - 1.0) * 100).toFixed(2)
  const passed = slopeErrorPct <= tolerancePct && Math.abs(offset) <= 0.25

  return {
    slope,
    offset,
    slopeErrorPct,
    passed,
  }
}

const STORAGE_KEY = 'aquatrust-calibration-store-v1'

const INITIAL_CALIBRATIONS = {
  'AIT-201': {
    sensorId: 'AIT-201',
    sensorName: 'Aeration Basin Dissolved Oxygen',
    unit: 'mg/L',
    status: CALIBRATION_STATUS.VALID,
    method: CALIBRATION_METHODS.ZERO_SPAN,
    lastCalibrated: new Date(Date.now() - 12 * 86400000).toISOString(),
    nextDueDate: new Date(Date.now() + 18 * 86400000).toISOString(),
    technician: 'V. Nair (Lead Metrologist)',
    lotNumber: 'NIST-DO-LOT-8841',
    lotExpiry: '2027-04-30',
    slope: 0.992,
    offset: -0.02,
    slopeErrorPct: 0.8,
    inHold: false,
    lastResult: 'PASS',
    history: [
      {
        id: 'CAL-01',
        date: new Date(Date.now() - 12 * 86400000).toISOString(),
        method: CALIBRATION_METHODS.ZERO_SPAN,
        result: 'PASS',
        slope: 0.992,
        offset: -0.02,
        technician: 'V. Nair',
        lotNumber: 'NIST-DO-LOT-8841',
      },
    ],
  },
  'AIT-501': {
    sensorId: 'AIT-501',
    sensorName: 'Effluent Outfall pH Electrode',
    unit: 'pH',
    status: CALIBRATION_STATUS.VALID,
    method: CALIBRATION_METHODS.MULTI_POINT,
    lastCalibrated: new Date(Date.now() - 5 * 86400000).toISOString(),
    nextDueDate: new Date(Date.now() + 25 * 86400000).toISOString(),
    technician: 'S. Kulkarni',
    lotNumber: 'BUF-PH-4710-91',
    lotExpiry: '2027-08-15',
    slope: 1.008,
    offset: 0.04,
    slopeErrorPct: 0.8,
    inHold: false,
    lastResult: 'PASS',
    history: [
      {
        id: 'CAL-02',
        date: new Date(Date.now() - 5 * 86400000).toISOString(),
        method: CALIBRATION_METHODS.MULTI_POINT,
        result: 'PASS',
        slope: 1.008,
        offset: 0.04,
        technician: 'S. Kulkarni',
        lotNumber: 'BUF-PH-4710-91',
      },
    ],
  },
  'AIT-504': {
    sensorId: 'AIT-504',
    sensorName: 'Effluent Total Suspended Solids (TSS)',
    unit: 'mg/L',
    status: CALIBRATION_STATUS.DUE,
    method: CALIBRATION_METHODS.ZERO_SPAN,
    lastCalibrated: new Date(Date.now() - 28 * 86400000).toISOString(),
    nextDueDate: new Date(Date.now() + 2 * 86400000).toISOString(), // Due in 2 days (Amber)
    technician: 'P. Operator',
    lotNumber: 'FORMAZIN-TSS-2026',
    lotExpiry: '2026-12-31',
    slope: 0.978,
    offset: 0.11,
    slopeErrorPct: 2.2,
    inHold: false,
    lastResult: 'PASS',
    history: [],
  },
}

let calibrationState = (() => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch {
    // fallback
  }
  return { ...INITIAL_CALIBRATIONS }
})()

const listeners = new Set()

function notifyListeners() {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(calibrationState))
    }
  } catch {
    // ignore
  }
  listeners.forEach((l) => l({ ...calibrationState }))
}

export function getSensorCalibration(sensorId) {
  return (
    calibrationState[sensorId] || {
      sensorId,
      status: CALIBRATION_STATUS.VALID,
      lastCalibrated: null,
      nextDueDate: null,
      inHold: false,
      lastResult: 'PASS',
      history: [],
    }
  )
}

/**
 * Check if a sensor must be excluded from the compliance calculation.
 * True when in HOLD mode (UNDER CALIBRATION) or if the last calibration resulted in FAIL.
 */
export function isSensorExcludedFromCompliance(sensorId) {
  const cal = calibrationState[sensorId]
  if (!cal) return false
  return cal.inHold === true || cal.lastResult === 'FAIL' || cal.status === CALIBRATION_STATUS.HOLD
}

/**
 * Place a sensor into or out of calibration HOLD.
 * When in HOLD, tag quality is marked UNCERTAIN and it is excluded from compliance scoring.
 */
export function setSensorHold(sensorId, inHold) {
  const current = getSensorCalibration(sensorId)
  calibrationState = {
    ...calibrationState,
    [sensorId]: {
      ...current,
      inHold: Boolean(inHold),
      status: inHold ? CALIBRATION_STATUS.HOLD : current.lastResult === 'FAIL' ? CALIBRATION_STATUS.FAILED : CALIBRATION_STATUS.VALID,
    },
  }
  notifyListeners()
}

/**
 * Record a certified calibration event, update status, and log to the central audit store.
 */
export function recordCalibration({
  sensorId,
  method,
  slope,
  offset,
  slopeErrorPct,
  passed,
  technician,
  lotNumber,
  lotExpiry,
  signatureMeaning = 'Calibrated',
}) {
  const now = new Date()
  const nextDue = new Date(now.getTime() + 30 * 86400000).toISOString()
  const current = getSensorCalibration(sensorId)

  const historyEntry = {
    id: `CAL-${Date.now()}`,
    date: now.toISOString(),
    method,
    result: passed ? 'PASS' : 'FAIL',
    slope,
    offset,
    slopeErrorPct,
    technician,
    lotNumber,
    lotExpiry,
    signatureMeaning,
  }

  calibrationState = {
    ...calibrationState,
    [sensorId]: {
      ...current,
      status: passed ? CALIBRATION_STATUS.VALID : CALIBRATION_STATUS.FAILED,
      lastCalibrated: now.toISOString(),
      nextDueDate: nextDue,
      technician,
      lotNumber,
      lotExpiry,
      slope,
      offset,
      slopeErrorPct,
      inHold: false, // Release hold upon completion
      lastResult: passed ? 'PASS' : 'FAIL',
      history: [historyEntry, ...(current.history || [])],
    },
  }

  // Audit event log to immutable ledger
  addAuditEvent({
    action: AUDIT_ACTIONS.CALIBRATION,
    tagId: sensorId,
    oldValue: current.lastCalibrated ? `Last cal: ${current.lastCalibrated.slice(0, 10)}` : 'Initial',
    newValue: `${method} (${passed ? 'PASS' : 'FAIL'}): Slope ${slope}, Offset ${offset}`,
    reason: `ISO 17025 sensor calibration by ${technician} (Lot: ${lotNumber})`,
    userName: technician,
    role: 'Plant Operator',
    signatureMeaning,
  })

  notifyListeners()
  return historyEntry
}

/**
 * Calculate compliance score across sensors/parameters while strictly excluding
 * any sensor that is currently in HOLD or FAILED calibration.
 */
export function calculateComplianceScoreWithExclusions(readingsList) {
  if (!Array.isArray(readingsList) || readingsList.length === 0) return 100

  // Filter out any sensor in HOLD or with FAILED calibration
  const activeSensors = readingsList.filter((item) => {
    const id = item.sensorId || item.id || item.tagId
    return !isSensorExcludedFromCompliance(id)
  })

  if (activeSensors.length === 0) return 100

  const compliantCount = activeSensors.filter((s) => s.isCompliant || s.status === 'compliant' || s.pass === true).length
  return Math.round((compliantCount / activeSensors.length) * 100)
}

/**
 * React hook to subscribe to live calibration state updates.
 */
export function useSensorCalibrations() {
  const [state, setState] = useState(() => ({ ...calibrationState }))

  useEffect(() => {
    const handleUpdate = (updatedState) => {
      setState(updatedState)
    }
    listeners.add(handleUpdate)
    return () => {
      listeners.delete(handleUpdate)
    }
  }, [])

  return state
}
