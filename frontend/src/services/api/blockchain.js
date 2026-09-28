import apiClient from '../apiClient.js'

/**
 * FastAPI Blockchain & Verification Client
 * Conforms to FRONTEND_API_MAPPING.md & API_ENDPOINT_REGISTRY.md
 */

export async function getAnchoredRecords() {
  const response = await apiClient.get('/api/v1/dlt/anchors')
  const rows = Array.isArray(response.data) ? response.data : []
  
  // Normalize snake_case response from FastAPI DLTAnchorResponse into frontend shape
  return rows.map((r) => ({
    id: r.record_id || r.id || r.anchor_id,
    facilityId: r.facility_id ? String(r.facility_id).slice(0, 8) : (r.facilityId || 'STP-BLR-001'),
    canonicalHash: r.canonical_hash || r.canonicalHash,
    anchorTime: r.anchored_at || r.created_at || r.event_timestamp || r.anchorTime,
    txRef: r.transaction_id || r.txRef || r.tx_id || 'tx-pending',
    status: (r.anchor_status || r.status || 'confirmed').toLowerCase(),
    blockNumber: r.block_number ?? (r.network_reference?.block_number),
    complianceStatus: r.compliance_status || 'compliant',
    raw: r,
  }))
}

export async function verifyRecord(recordId) {
  try {
    const response = await apiClient.post(`/api/v1/verification/records/${encodeURIComponent(recordId)}`)
    const res = response.data
    const isAuthentic = res.overall_verdict === 'AUTHENTIC' || res.verified === true
    const stages = res.stages || {}

    return {
      recordId: res.record_id || recordId,
      verified: isAuthentic,
      checkedAt: res.verification_timestamp || new Date().toISOString(),
      canonicalHash: res.canonical_hash,
      channel: 'aquatrustchannel',
      endorsement: res.dlt_tx_id ? `Tx: ${String(res.dlt_tx_id).slice(0, 14)}…` : 'Hyperledger Fabric Multi-Org Consensus',
      message: isAuthentic
        ? `Record "${res.record_id || recordId}" successfully verified on ledger. All 4 cryptographic stages passed.`
        : `Record verification failed: ${res.overall_verdict || 'TAMPER_DETECTED'}. One or more cryptographic stages did not match.`,
      checks: {
        recordExists: stages.stage_1_canonical_hash?.passed !== false,
        canonicalHashMatch: stages.stage_1_canonical_hash?.passed ?? isAuthentic,
        signatureVerified: stages.stage_2_signature?.passed ?? isAuthentic,
        ledgerAnchorConfirmed: stages.stage_4_dlt_anchor?.passed ?? isAuthentic,
      },
      raw: res,
    }
  } catch (err) {
    // If backend returns 404 or verification failure, return formatted verification report
    if (err?.response?.status === 404) {
      return {
        recordId,
        verified: false,
        checkedAt: new Date().toISOString(),
        checks: {
          recordExists: false,
          canonicalHashMatch: false,
          signatureVerified: false,
          ledgerAnchorConfirmed: false,
        },
        message: `Record "${recordId}" was not found on the immutable distributed ledger.`,
      }
    }
    throw err
  }
}

export async function getTransactionById(txId) {
  const response = await apiClient.get(`/api/v1/dlt/transactions/${encodeURIComponent(txId)}`)
  return response.data
}

