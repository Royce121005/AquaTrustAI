// PROVISIONAL — pending backend contract
// Model outputs are stand-in shapes only; no AI model is connected yet.
// Shapes follow the contracts documented in src/types/insights.js.
// Fabricated numbers below (scores, confidence bounds) exist solely so the UI
// can be exercised, and are always labelled as provisional/demo output.
import { respondWith } from './mockUtils.js'

// COD is the primary ML target agreed with the AI/ML member.
export async function getPredictions() {
  const startMs = Date.now()
  const pointCount = 24
  const points = []

  for (let i = 0; i < pointCount; i += 1) {
    const timestamp = new Date(startMs + i * 3_600_000).toISOString()
    const wave = Math.sin((i / pointCount) * Math.PI * 3)
    const predictedValue = Number((52 + 8 * wave).toFixed(2))
    const spread = Number((2 + i * 0.15).toFixed(2))
    points.push({
      timestamp,
      actualValue: null,
      predictedValue,
      confidenceLow: Number((predictedValue - spread).toFixed(2)),
      confidenceHigh: Number((predictedValue + spread).toFixed(2)),
    })
  }

  return respondWith({
    parameterId: 'cod',
    unit: 'mg/L',
    modelVersion: 'provisional-demo-v0',
    generatedAt: new Date(startMs).toISOString(),
    horizonHours: 24,
    points,
    notes: 'Placeholder waveform for UI development — not a real model output.',
  })
}

const ANOMALIES = [
  {
    id: 'anomaly-001',
    timestamp: '2026-08-25T07:38:00Z',
    parameterId: 'cod',
    observedValue: null,
    expectedValue: null,
    severity: 'high',
    score: 0.94,
    description: 'Placeholder anomaly: deviation flagged by rules-engine stand-in',
    explanation: null,
  },
  {
    id: 'anomaly-002',
    timestamp: '2026-08-25T03:21:00Z',
    parameterId: 'tss',
    observedValue: null,
    expectedValue: null,
    severity: 'medium',
    score: 0.71,
    description: 'Placeholder anomaly: brief fluctuation detected',
    explanation: null,
  },
  {
    id: 'anomaly-003',
    timestamp: '2026-08-24T22:05:00Z',
    parameterId: 'ph',
    observedValue: null,
    expectedValue: null,
    severity: 'low',
    score: 0.42,
    description: 'Placeholder anomaly: minor drift observed',
    explanation: null,
  },
]

export async function getAnomalies() {
  return respondWith(ANOMALIES)
}

const RECOMMENDATIONS = [
  {
    id: 'rec-001',
    priority: 'high',
    message: 'Placeholder recommendation: review the flagged process within the next shift.',
    reason: null,
    suggestedAction: null,
    relatedParameterId: 'cod',
  },
  {
    id: 'rec-002',
    priority: 'medium',
    message: 'Placeholder recommendation: schedule calibration for low-battery sensors.',
    reason: null,
    suggestedAction: null,
    relatedParameterId: null,
  },
  {
    id: 'rec-003',
    priority: 'low',
    message: 'Placeholder recommendation: archive last month\u2019s operational summaries.',
    reason: null,
    suggestedAction: null,
    relatedParameterId: null,
  },
]

export async function getRecommendations() {
  return respondWith(RECOMMENDATIONS)
}
