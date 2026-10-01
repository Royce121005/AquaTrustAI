import axios from 'axios'
import { API_BASE_URL } from '../config/env.js'
import { normalizeApiError } from './apiErrors.js'

const TOKEN_STORAGE_KEY = 'aquatrust-token'

export function getStoredToken() {
  try {
    return (
      window.sessionStorage.getItem(TOKEN_STORAGE_KEY) ||
      window.localStorage.getItem(TOKEN_STORAGE_KEY) ||
      null
    )
  } catch {
    return null
  }
}

export function clearStoredTokens() {
  try {
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    window.localStorage.removeItem('aquatrust-auth-user')
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

const apiClient = axios.create({
  baseURL: API_BASE_URL || undefined,
  timeout: 15000,
  headers: { Accept: 'application/json' },
})

// Request Interceptor: Attach JWT Bearer Token
apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken()
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response Interceptor: Handle 401/403 and normalize errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status

    if (status === 401) {
      clearStoredTokens()
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent('aquatrust:auth:unauthorized', {
            detail: { error: normalizeApiError(error) },
          }),
        )
      }
    } else if (status === 403) {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent('aquatrust:auth:forbidden', {
            detail: { error: normalizeApiError(error) },
          }),
        )
      }
    }

    return Promise.reject(normalizeApiError(error))
  },
)

export default apiClient
