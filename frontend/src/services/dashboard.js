import { USE_API } from '../config/env.js'
import * as mockImplementation from './mock/dashboard.js'
import * as apiImplementation from './api/dashboard.js'

const implementation = USE_API ? apiImplementation : mockImplementation

export const getDashboardOverview = implementation.getDashboardOverview
export const getTreatmentStatus = implementation.getTreatmentStatus
export const getRecentAlerts = implementation.getRecentAlerts
