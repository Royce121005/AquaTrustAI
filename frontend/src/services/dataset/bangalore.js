// DATASET-BACKED implementation (bangalore_clean.csv).
// This data is bundled with the frontend, so it works in both mock mode and API
// mode. When the FastAPI backend starts serving monitoring history, these calls
// can be redirected to the backend — the public service signatures stay stable.

import {
  getBangaloreDatasetInfo,
  getCityCapacitySummary,
  getStpHistoricalData,
  getStpLatestSnapshot,
  getAllStpSnapshots as getAllSnapshots,
  evaluateCpcbCompliance,
  getStpOptions,
  getStpParameterTrend,
} from '../../data/bangaloreDataset.js'

export { getBangaloreDatasetInfo, getCityCapacitySummary, getStpOptions, evaluateCpcbCompliance }

export async function getStpTrend(stpId, parameterId) {
  return getStpParameterTrend({ stpId, parameterId })
}

export function getStpHistory(filters = {}) {
  return getStpHistoricalData(filters)
}

export function getStpSnapshot(stpId) {
  return getStpLatestSnapshot(stpId)
}

export function getAllStpSnapshots() {
  return getAllSnapshots()
}

