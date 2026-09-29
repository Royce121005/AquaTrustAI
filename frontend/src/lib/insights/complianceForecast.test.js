import { describe, it, expect } from 'vitest'
import {
  computeLinearRegression,
  forecastTagCompliance,
  getOutfallComplianceForecast,
  OUTFALL_TAGS,
} from './complianceForecast.js'

describe('complianceForecast — Linear Regression & Predictive Horizons', () => {
  it('correctly calculates slope, intercept, and R^2 for deterministic linear data', () => {
    // y = 2x + 5
    const series = [
      { x: 0, y: 5 },
      { x: 1, y: 7 },
      { x: 2, y: 9 },
      { x: 3, y: 11 },
      { x: 4, y: 13 },
    ]

    const result = computeLinearRegression(series)
    expect(result.slope).toBeCloseTo(2.0, 4)
    expect(result.intercept).toBeCloseTo(5.0, 4)
    expect(result.r2).toBeCloseTo(1.0, 4)
  })

  it('handles edge case inputs gracefully without throwing', () => {
    expect(computeLinearRegression([])).toEqual({ slope: 0, intercept: 0, r2: 0 })
    expect(computeLinearRegression([{ x: 1, y: 2 }])).toEqual({ slope: 0, intercept: 0, r2: 0 })
  })

  it('forecasts time-to-breach and synthesizes plain-language advisory for COD (AIT-503)', () => {
    // Current COD at 42 mg/L, steadily rising towards 50 mg/L limit
    const history = [
      { x: 0, value: 38.0 },
      { x: 1, value: 39.0 },
      { x: 2, value: 40.0 },
      { x: 3, value: 41.0 },
      { x: 4, value: 42.0 },
    ]

    const forecast = forecastTagCompliance('AIT-503', 42.0, history)
    expect(forecast).not.toBeNull()
    expect(forecast.tagId).toBe('AIT-503')
    expect(forecast.isApproachingLimit).toBe(true)
    expect(forecast.slope).toBeGreaterThan(0)
    expect(forecast.confidence).toBe('high')
    expect(forecast.plainText).toContain('COD trending toward 50')
    expect(forecast.plainText).toContain('predicted breach in')
    expect(forecast.plainText).toContain('confidence: high')
    expect(forecast.plainText).toContain('suggested action:')
  })

  it('evaluates all 5 outfall tags in getOutfallComplianceForecast', () => {
    const tagValues = {
      'AIT-501': { value: 7.35 },
      'AIT-502': { value: 8.2 },
      'AIT-503': { value: 43.5 },
      'AIT-504': { value: 13.0 },
      'AIT-505': { value: 3.1 },
    }

    const report = getOutfallComplianceForecast(tagValues)
    expect(report.allForecasts).toHaveLength(OUTFALL_TAGS.length)
    expect(report.topForecast).toBeDefined()
    expect(OUTFALL_TAGS).toContain(report.topForecast.tagId)
  })
})
