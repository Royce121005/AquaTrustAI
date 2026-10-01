import apiClient from '../apiClient.js'

/**
 * Sends login credentials to the backend API.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ access_token: string, token_type: string, user_id: string, username: string, role: string, facility_id: string|null }>}
 */
export async function loginApi(username, password) {
  const response = await apiClient.post('/api/v1/auth/login', {
    username,
    password,
  })
  return response.data
}

/**
 * Retrieves the currently authenticated user profile from token claims.
 * @returns {Promise<{ sub: string, user_id: string, username: string, role: string, facility_id: string|null }>}
 */
export async function getCurrentUserApi() {
  const response = await apiClient.get('/api/v1/auth/me')
  return response.data
}

/**
 * Registers a new user with an enterprise role.
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function registerApi(payload) {
  const response = await apiClient.post('/api/v1/auth/register', payload)
  return response.data
}
