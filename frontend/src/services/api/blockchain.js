import apiClient from '../apiClient.js'

/**
 * FastAPI Blockchain & Verification Client
 * Conforms to FRONTEND_API_MAPPING.md & API_ENDPOINT_REGISTRY.md
 */

export async function getAnchoredRecords() {
  const response = await apiClient.get('/api/v1/dlt/anchors')
  return response.data
}

export async function verifyRecord(recordId) {
  try {
    const response = await apiClient.post(`/api/v1/verification/records/${encodeURIComponent(recordId)}`)
    return response.data
  } catch (err) {
    // If backend returns 404 or verification failure, return formatted verification report
    if (err?.response?.status === 404) {
      return {
        recordId,
        verified: false,
        checkedAt: new Date().toISOString(),
        checks: { recordExists: false, anchoringConfirmed: false, signatureValid: false },
        message: `Record "${recordId}" not found on ledger`,
      }
    }
    throw err
  }
}

export async function getTransactionById(txId) {
  const response = await apiClient.get(`/api/v1/dlt/transactions/${encodeURIComponent(txId)}`)
  return response.data
}
