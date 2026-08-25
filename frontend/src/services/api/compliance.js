// FastAPI implementation seam — endpoint paths are intentionally TBD until the
// backend compliance contract arrives. Preserve the reject-on-missing-report
// behaviour (mirrors HTTP 404) when mapping real responses.
import { notImplementedError } from '../apiErrors.js'

export function getComplianceSummary() {
  return Promise.reject(notImplementedError('getComplianceSummary'))
}

export function getReports() {
  return Promise.reject(notImplementedError('getReports'))
}

export function getReportById() {
  return Promise.reject(notImplementedError('getReportById'))
}
