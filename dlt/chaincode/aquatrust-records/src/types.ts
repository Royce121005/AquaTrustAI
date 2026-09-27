/**
 * AquaTrust AI — Hyperledger Fabric Types and Interfaces
 * Baseline: FABRIC_ARCHITECTURE.md v2.2.1
 */

export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'EXEMPT';

export interface AnchorRecord {
  docType: 'anchor';
  anchor_id: string;
  record_id: string; // Primary Key
  certificate_id: string;
  facility_id: string;
  event_timestamp: string; // ISO 8601 UTC
  canonical_hash: string; // 64-char lowercase hex SHA-256
  compliance_status: ComplianceStatus;
  signature_algorithm: string; // e.g. ES256
  signature_key_id: string;
  record_version: number;
  anchor_schema_version: string; // e.g. atc-v1
  tx_id: string;
  committed_at: string;
}

export interface CorrectionLink {
  docType: 'correction_link';
  original_record_id: string;
  corrected_record_id: string;
  reason: string;
  timestamp: string;
  actor_msp: string;
  tx_id: string;
}

export interface VerificationResult {
  record_id: string;
  verified: boolean;
  ledger_canonical_hash?: string;
  provided_hash: string;
  compliance_status?: ComplianceStatus;
  timestamp?: string;
  error?: string;
}
