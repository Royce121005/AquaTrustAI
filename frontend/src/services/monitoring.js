import { USE_API } from '../config/env.js'
import * as mockImplementation from './mock/monitoring.js'
import * as apiImplementation from './api/monitoring.js'
import * as datasetImplementation from './dataset/bangalore.js'

// Sensor-style feeds still switch between provisional mock data and the future
// FastAPI backend.
const implementation = USE_API ? apiImplementation : mockImplementation

export const getParameterTrend = implementation.getParameterTrend
export const getSensors = implementation.getSensors
export const getHistoricalData = implementation.getHistoricalData

// Dataset-derived functions (bangalore_clean.csv) are frontend-local today;
// they will be re-pointed to the backend without changing these signatures.
export const getStpOptions = datasetImplementation.getStpOptions
export const getStpTrend = datasetImplementation.getStpTrend
export const getStpHistory = datasetImplementation.getStpHistory
export const getStpSnapshot = datasetImplementation.getStpSnapshot
export const getBangaloreDatasetInfo = datasetImplementation.getBangaloreDatasetInfo
