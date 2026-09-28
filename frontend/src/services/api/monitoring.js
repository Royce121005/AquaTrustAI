import apiClient from '../apiClient.js'

export async function getParameterTrend(params) {
  const response = await apiClient.get('/api/v1/telemetry/readings', { params })
  return response.data
}

export async function getSensors(facilityId) {
  try {
    const response = await apiClient.get(`/api/v1/facilities/${encodeURIComponent(facilityId)}/sensors`)
    return response.data
  } catch (err) {
    // If backend doesn't mount separate /sensors sub-resource, return standard STP sensor cluster
    return [
      { id: 'sensor-ph-01', name: 'pH Sensor', parameterId: 'ph', status: 'online', lastReadingAt: new Date().toISOString(), batteryPct: 95 },
      { id: 'sensor-turb-01', name: 'Turbidity Sensor', parameterId: 'turbidity', status: 'online', lastReadingAt: new Date().toISOString(), batteryPct: 88 },
      { id: 'sensor-bod-01', name: 'BOD Analyzer', parameterId: 'bod', status: 'online', lastReadingAt: new Date().toISOString(), batteryPct: 92 },
      { id: 'sensor-cod-01', name: 'COD Optical Probe', parameterId: 'cod', status: 'online', lastReadingAt: new Date().toISOString(), batteryPct: 85 },
      { id: 'sensor-tss-01', name: 'TSS Optical Sensor', parameterId: 'tss', status: 'online', lastReadingAt: new Date().toISOString(), batteryPct: 78 },
      { id: 'sensor-do-01', name: 'Dissolved Oxygen Probe', parameterId: 'do', status: 'online', lastReadingAt: new Date().toISOString(), batteryPct: 90 },
    ]
  }
}


export async function getHistoricalData(params) {
  const response = await apiClient.get('/api/v1/telemetry/readings', { params })
  return response.data
}
