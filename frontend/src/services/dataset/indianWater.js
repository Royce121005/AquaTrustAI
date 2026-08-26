// DATASET-BACKED implementation (indian_water_clean.csv).
// Reference/compliance-supporting water-quality records bundled with the
// frontend. No compliance verdicts are derived here: regulatory thresholds are
// not configured anywhere in this project yet.

import {
  getIndianWaterDatasetInfo,
  getWaterQualityRecords,
} from '../../data/indianWaterDataset.js'

export { getIndianWaterDatasetInfo }

export function getWaterQualityReference(filters = {}) {
  return getWaterQualityRecords(filters)
}
