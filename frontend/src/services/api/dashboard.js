// FastAPI implementation seam — endpoint paths are intentionally TBD until the
// backend OpenAPI contract arrives. When wiring: call apiClient here and map
// the response into the established frontend shape before returning it.
import { notImplementedError } from '../apiErrors.js'

export function getDashboardOverview() {
  return Promise.reject(notImplementedError('getDashboardOverview'))
}

export function getTreatmentStatus() {
  return Promise.reject(notImplementedError('getTreatmentStatus'))
}

export function getRecentAlerts() {
  return Promise.reject(notImplementedError('getRecentAlerts'))
}
