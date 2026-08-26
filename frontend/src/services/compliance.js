import { USE_API } from '../config/env.js'
import * as mockImplementation from './mock/compliance.js'
import * as apiImplementation from './api/compliance.js'
import * as datasetImplementation from './dataset/indianWater.js'

const implementation = USE_API ? apiImplementation : mockImplementation

export const getComplianceSummary = implementation.getComplianceSummary
export const getReports = implementation.getReports
export const getReportById = implementation.getReportById

// Dataset-derived reference data (indian_water_clean.csv) is frontend-local
// today; it will be re-pointed to the backend without changing these signatures.
export const getWaterQualityReference = datasetImplementation.getWaterQualityReference
export const getIndianWaterDatasetInfo = datasetImplementation.getIndianWaterDatasetInfo
