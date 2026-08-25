import { USE_API } from '../config/env.js'
import * as mockImplementation from './mock/compliance.js'
import * as apiImplementation from './api/compliance.js'

const implementation = USE_API ? apiImplementation : mockImplementation

export const getComplianceSummary = implementation.getComplianceSummary
export const getReports = implementation.getReports
export const getReportById = implementation.getReportById
