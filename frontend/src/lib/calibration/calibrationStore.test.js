import { describe, it, expect, beforeEach } from 'vitest'
import {
  computeMultiPointCalibration,
  computeZeroSpanCalibration,
  isSensorExcludedFromCompliance,
  setSensorHold,
  recordCalibration,
  calculateComplianceScoreWithExclusions,
  CALIBRATION_METHODS,
} from './calibrationStore.js'

describe('Sensor Metrology & Calibration Engine', () => {
  describe('computeMultiPointCalibration (Linear Regression)', () => {
    it('computes exact slope = 1.0 and offset = 0.0 for ideal pH buffer measurements (4.01, 7.00, 10.01)', () => {
      const idealPoints = [
        { expected: 4.01, measured: 4.01 },
        { expected: 7.0, measured: 7.0 },
        { expected: 10.01, measured: 10.01 },
      ]
      const res = computeMultiPointCalibration(idealPoints, 5.0)

      expect(res.slope).toBe(1.0)
      expect(res.offset).toBe(0.0)
      expect(res.slopeErrorPct).toBe(0.0)
      expect(res.passed).toBe(true)
    })

    it('passes within tolerance when slope error is 3.5% (below 5% boundary)', () => {
      const points = [
        { expected: 4.0, measured: 3.9 },
        { expected: 7.0, measured: 6.95 },
        { expected: 10.0, measured: 10.15 },
      ]
      const res = computeMultiPointCalibration(points, 5.0)
      expect(res.slopeErrorPct).toBeLessThanOrEqual(5.0)
      expect(res.passed).toBe(true)
    })

    it('fails when slope error exceeds tolerance (e.g. slope 0.92 = 8% error > 5% tolerance)', () => {
      const degradedPoints = [
        { expected: 4.0, measured: 3.6 },
        { expected: 7.0, measured: 6.3 },
        { expected: 10.0, measured: 9.0 },
      ]
      const res = computeMultiPointCalibration(degradedPoints, 5.0)
      expect(res.slopeErrorPct).toBeGreaterThan(5.0)
      expect(res.passed).toBe(false)
    })
  })

  describe('computeZeroSpanCalibration (Two-Point Method)', () => {
    it('computes slope and offset for Optical DO sensor with sodium sulfite zero', () => {
      const res = computeZeroSpanCalibration({
        zeroExpected: 0.0,
        zeroMeasured: 0.02,
        spanExpected: 8.25, // 100% air-saturated water
        spanMeasured: 8.35,
        tolerancePct: 5.0,
      })

      expect(res.offset).toBe(0.02)
      expect(res.slope).toBeCloseTo(1.0097, 2)
      expect(res.slopeErrorPct).toBeLessThan(5.0)
      expect(res.passed).toBe(true)
    })

    it('fails at the tolerance boundary when slope error exceeds 5.0%', () => {
      const res = computeZeroSpanCalibration({
        zeroExpected: 0.0,
        zeroMeasured: 0.0,
        spanExpected: 10.0,
        spanMeasured: 10.6, // 6% error
        tolerancePct: 5.0,
      })

      expect(res.slope).toBe(1.06)
      expect(res.slopeErrorPct).toBe(6.0)
      expect(res.passed).toBe(false)
    })
  })

  describe('Compliance Score Exclusion Logic', () => {
    it('excludes sensor from compliance calculation when in calibration HOLD', () => {
      const sensorId = 'AIT-TEST-01'

      // Initially not in hold
      setSensorHold(sensorId, false)
      expect(isSensorExcludedFromCompliance(sensorId)).toBe(false)

      // Place in HOLD
      setSensorHold(sensorId, true)
      expect(isSensorExcludedFromCompliance(sensorId)).toBe(true)

      // Sample readings: 2 sensors (1 non-compliant, 1 excluded test sensor)
      const fleetReadings = [
        { id: 'REGULAR-SENSOR', isCompliant: false },
        { id: sensorId, isCompliant: true }, // in HOLD! Must be skipped!
      ]

      // If excluded sensor were counted, score would be (0+1)/2 = 50%.
      // But because it is in HOLD, only the regular sensor is evaluated => 0/1 = 0%.
      const score = calculateComplianceScoreWithExclusions(fleetReadings)
      expect(score).toBe(0)

      // Release HOLD
      setSensorHold(sensorId, false)
      expect(isSensorExcludedFromCompliance(sensorId)).toBe(false)
      const scoreAfterRelease = calculateComplianceScoreWithExclusions(fleetReadings)
      expect(scoreAfterRelease).toBe(50)
    })
  })
})
