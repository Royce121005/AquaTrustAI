import apiClient from '../apiClient.js'

export async function getParameterTrend(params) {
  const response = await apiClient.get('/api/v1/telemetry/readings', { params })
  return response.data
}

export async function getSensors(facilityId) {
  const response = await apiClient.get(`/api/v1/facilities/${encodeURIComponent(facilityId)}/sensors`)
  return response.data
}

export async function getHistoricalData(params) {
  const response = await apiClient.get('/api/v1/telemetry/readings', { params })
  return response.data
}
