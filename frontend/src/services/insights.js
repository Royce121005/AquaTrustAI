import { USE_API } from '../config/env.js'
import * as mockImplementation from './mock/insights.js'
import * as apiImplementation from './api/insights.js'

const implementation = USE_API ? apiImplementation : mockImplementation

export const getPredictions = implementation.getPredictions
export const getAnomalies = implementation.getAnomalies
export const getRecommendations = implementation.getRecommendations
