// PROVISIONAL — pending backend contract
// Series values are synthetic waveforms, NOT real measurements.
import { respondWith } from './mockUtils.js'

export const PARAMETERS = [
  { id: 'temperature', label: 'Temperature', unit: '\u00B0C', decimals: 1, base: 22, amplitude: 3 },
  { id: 'turbidity', label: 'Turbidity', unit: 'NTU', decimals: 2, base: 4.5, amplitude: 1.8 },
  { id: 'conductivity', label: 'Conductivity', unit: '\u00B5S/cm', decimals: 0, base: 640, amplitude: 45 },
  { id: 'flow-rate', label: 'Flow rate', unit: 'm\u00B3/h', decimals: 1, base: 18, amplitude: 6 },
]

function resolveParameter(parameterId) {
  const config = PARAMETERS.find((parameter) => parameter.id === parameterId)
  if (!config) {
    const available = PARAMETERS.map((parameter) => parameter.id).join(', ')
    throw new Error(`Unknown parameter "${parameterId}". Available parameters: ${available}`)
  }
  return config
}

function buildPoints(config, pointCount, intervalMinutes, endMs) {
  const points = []
  for (let i = 0; i < pointCount; i += 1) {
    const timestamp = new Date(endMs - (pointCount - 1 - i) * intervalMinutes * 60_000).toISOString()
    const wave = Math.sin((i / pointCount) * Math.PI * 4)
    const value = Number((config.base + config.amplitude * wave).toFixed(config.decimals))
    points.push({ timestamp, value })
  }
  return points
}

export async function getParameterTrend(parameterId = PARAMETERS[0].id) {
  const config = resolveParameter(parameterId)
  const points = buildPoints(config, 48, 30, Date.now())
  return respondWith({
    parameter: { id: config.id, label: config.label, unit: config.unit },
    points,
  })
}

const SENSORS = [
  { id: 'sensor-01', name: 'Sensor 01', parameterId: 'temperature', status: 'online', lastReadingAt: '2026-08-25T08:14:00Z', batteryPct: 87 },
  { id: 'sensor-02', name: 'Sensor 02', parameterId: 'turbidity', status: 'online', lastReadingAt: '2026-08-25T08:13:00Z', batteryPct: 64 },
  { id: 'sensor-03', name: 'Sensor 03', parameterId: 'conductivity', status: 'online', lastReadingAt: '2026-08-25T08:15:00Z', batteryPct: 91 },
  { id: 'sensor-04', name: 'Sensor 04', parameterId: 'flow-rate', status: 'online', lastReadingAt: '2026-08-25T08:14:00Z', batteryPct: 58 },
  { id: 'sensor-05', name: 'Sensor 05', parameterId: 'turbidity', status: 'offline', lastReadingAt: '2026-08-24T19:47:00Z', batteryPct: 9 },
  { id: 'sensor-06', name: 'Sensor 06', parameterId: 'temperature', status: 'maintenance', lastReadingAt: '2026-08-25T07:02:00Z', batteryPct: 73 },
]

export async function getSensors() {
  return respondWith(SENSORS)
}

export async function getHistoricalData(filters = {}) {
  const { parameterId = PARAMETERS[0].id, from, to, intervalMinutes = 60 } = filters ?? {}
  const config = resolveParameter(parameterId)

  const toMs = to ? new Date(to).getTime() : Date.now()
  const fromMs = from ? new Date(from).getTime() : toMs - 7 * 24 * 60 * 60 * 1000
  if (Number.isNaN(toMs) || Number.isNaN(fromMs)) {
    throw new Error('filters.from and filters.to must be valid date strings')
  }

  const rawPointCount = Math.floor((toMs - fromMs) / (intervalMinutes * 60_000)) + 1
  const pointCount = Math.max(2, Math.min(rawPointCount, 240))
  const points = buildPoints(config, pointCount, intervalMinutes, toMs)

  return respondWith({
    parameter: { id: config.id, label: config.label, unit: config.unit },
    from: new Date(toMs - (pointCount - 1) * intervalMinutes * 60_000).toISOString(),
    to: new Date(toMs).toISOString(),
    intervalMinutes,
    pointCount,
    points,
  })
}
