import axios from 'axios'
import { API_BASE_URL } from '../config/env.js'
import { normalizeApiError } from './apiErrors.js'

const apiClient = axios.create({
  baseURL: API_BASE_URL || undefined,
  timeout: 15000,
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error)),
)

export default apiClient
