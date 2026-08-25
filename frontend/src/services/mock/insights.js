// PROVISIONAL — pending backend contract
// Model outputs are stand-in shapes only; no AI model is connected yet.
import { respondWith } from './mockUtils.js'

export async function getPredictions() {
  const startMs = Date.now()
  const pointCount = 24
  const points = []

  for (let i = 0; i < pointCount; i += 1) {
    const timestamp = new Date(startMs + i * 3_600_000).toISOString()
    const wave = Math.sin((i / pointCount) * Math.PI * 3)
    const predictedValue = Number((4.2 + 1.4 * wave).toFixed(2))
    const spread = Number((0.35 + i * 0.03).toFixed(2))
    points.push({
      timestamp,
      predictedValue,
      confidenceLow: Number((predictedValue - spread).toFixed(2)),
      confidenceHigh: Number((predictedValue + spread).toFixed(2)),
    })
  }

  return respondWith({
    modelVersion: 'provisional-demo-v0',
    generatedAt: new Date(startMs).toISOString(),
    parameterId: 'turbidity',
    horizonHours: 24,
    points,
  })
}

const ANOMALIES = [
  { id: 'anomaly-001', timestamp: '2026-08-25T07:38:00Z', severity: 'high', score: 0.94, parameterId: 'turbidity', description: 'Placeholder anomaly: deviation flagged by rules-engine stand-in' },
  { id: 'anomaly-002', timestamp: '2026-08-25T03:21:00Z', severity: 'medium', score: 0.71, parameterId: 'flow-rate', description: 'Placeholder anomaly: brief fluctuation detected' },
  { id: 'anomaly-003', timestamp: '2026-08-24T22:05:00Z', severity: 'low', score: 0.42, parameterId: 'temperature', description: 'Placeholder anomaly: minor drift observed' },
]

export async function getAnomalies() {
  return respondWith(ANOMALIES)
}

const RECOMMENDATIONS = [
  { id: 'rec-001', priority: 'high', message: 'Placeholder recommendation: review the flagged process within the next shift.' },
  { id: 'rec-002', priority: 'medium', message: 'Placeholder recommendation: schedule calibration for low-battery sensors.' },
  { id: 'rec-003', priority: 'low', message: 'Placeholder recommendation: archive last month\u2019s operational summaries.' },
]

export async function getRecommendations() {
  return respondWith(RECOMMENDATIONS)
}
