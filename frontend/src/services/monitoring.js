import { USE_API } from '../config/env.js'
import * as mockImplementation from './mock/monitoring.js'
import * as apiImplementation from './api/monitoring.js'

const implementation = USE_API ? apiImplementation : mockImplementation

export const getParameterTrend = implementation.getParameterTrend
export const getSensors = implementation.getSensors
export const getHistoricalData = implementation.getHistoricalData
