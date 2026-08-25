// FastAPI implementation seam — endpoint paths are intentionally TBD until the
// backend OpenAPI contract arrives. Map query params (parameterId, from, to,
// intervalMinutes) and responses into the frontend shapes here.
import { notImplementedError } from '../apiErrors.js'

export function getParameterTrend() {
  return Promise.reject(notImplementedError('getParameterTrend'))
}

export function getSensors() {
  return Promise.reject(notImplementedError('getSensors'))
}

export function getHistoricalData() {
  return Promise.reject(notImplementedError('getHistoricalData'))
}
