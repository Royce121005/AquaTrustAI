import apiClient from '../apiClient.js'

export async function getComplianceSummary() {
  const response = await apiClient.get('/api/v1/compliance/summary')
  return response.data
}

export async function getReports() {
  const response = await apiClient.get('/api/v1/treatment-records')
  return response.data
}

export async function getReportById(reportId) {
  const response = await apiClient.get(`/api/v1/treatment-records/${encodeURIComponent(reportId)}`)
  return response.data
}
