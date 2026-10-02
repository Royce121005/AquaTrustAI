// AquaTrustAI Canonical TypeScript Type Definitions

export type UserRole = 'operator' | 'auditor' | 'regulatory_stakeholder' | 'admin';

export interface User {
  user_id: string;
  username: string;
  email: string | null;
  role: UserRole;
  facility_id: string | null;
  display_name: string;
  status?: string;
  created_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  username: string;
  role: UserRole;
  facility_id: string | null;
}

export interface UserProfileResponse {
  user_id: string;
  username: string;
  email: string | null;
  role: UserRole;
  facility_id: string | null;
  display_name: string;
  status: string;
  created_at: string;
}

export interface UserRegisterRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  display_name?: string;
}

export interface Facility {
  facility_id: string;
  facility_name: string;
  facility_type: string;
  location: Record<string, unknown>;
  capacity: number | null;
  capacity_unit: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FacilityCreate {
  facility_name: string;
  facility_type: string;
  location?: Record<string, unknown>;
  capacity?: number;
  capacity_unit?: string;
  status?: string;
  provenance?: Record<string, unknown>;
}

export interface Sensor {
  sensor_id: string;
  facility_id: string;
  parameter: string;
  unit: string;
  treatment_stage: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Reading {
  reading_id: string;
  facility_id: string;
  sensor_id: string | null;
  observed_at: string;
  treatment_stage: string | null;
  parameter: string;
  value: number | null;
  unit: string;
  source: string;
  quality_status: string;
  anomaly_status: string | null;
  anomaly_score: number | null;
  created_at: string;
}

export interface ReadingIngestRequest {
  facility_id: string;
  sensor_id?: string;
  parameter: string;
  value: number;
  unit?: string;
  treatment_stage?: string;
  observed_at?: string;
  source?: string;
  quality_status?: string;
  provenance?: Record<string, unknown>;
}

export interface ReadingIngestResponse {
  reading_id: string;
  facility_id: string;
  parameter: string;
  value: number;
  unit: string;
  observed_at: string;
  quality_status: string;
  anomaly_status: string;
  anomaly_score: number | null;
  ingested_at: string;
}

export interface BatchIngestResponse {
  batch_id: string;
  facility_id: string;
  total_received: number;
  total_ingested: number;
  reading_ids: string[];
  status: string;
}

export interface ValidationResponse {
  validation_result_id: string;
  reading_id: string;
  quality_status: string;
  validation_flags: string[];
  validation_version: string;
  validated_at: string;
}

export interface ValidationStatsResponse {
  total_readings: number;
  valid_count: number;
  suspect_count: number;
  invalid_count: number;
  pending_count: number;
  valid_rate_percent: number;
}

export interface AnomalyResponse {
  anomaly_result_id?: string;
  reading_id?: string;
  anomaly_status: 'normal' | 'anomalous' | 'insufficient_data' | string;
  anomaly_score: number | null;
  model_version: string;
  feature_set_version: string;
  is_anomalous: boolean;
  features: Record<string, unknown> | null;
  inference_at: string;
}

export interface AnomalyMetricsSummary {
  total_inferences: number;
  anomalies_detected: number;
  anomaly_rate_percent: number;
  model_version: string;
  recent_events: Array<{
    anomaly_result_id: string;
    reading_id: string;
    anomaly_score: number | null;
    inference_at: string;
  }>;
}

export interface AnomalyInferRequest {
  reading_id?: string;
  facility_id?: string;
  parameter?: string;
  value?: number;
  unit?: string;
  observed_at?: string;
  treatment_stage?: string;
}

export interface ComplianceRule {
  rule_id: string;
  parameter: string;
  operator: string;
  threshold: number | null;
  threshold_min: number | null;
  threshold_max: number | null;
  threshold_unit: string;
  stage_scope: string | null;
  rule_version: string;
  source_reference: string;
  active: boolean;
  effective_from: string | null;
  effective_to: string | null;
}

export interface ComplianceParameterResult {
  parameter: string;
  observed_value: number | null;
  observed_unit: string | null;
  normalized_value: number | null;
  rule_id: string | null;
  rule_version: string | null;
  operator: string;
  threshold: number | null;
  threshold_min: number | null;
  threshold_max: number | null;
  threshold_unit: string;
  status: string;
  result: string;
  reason: string;
  sample_count: number;
  min_value: number | null;
  max_value: number | null;
  mean_value: number | null;
}

export interface ComplianceEvaluateResponse {
  compliance_result_id: string;
  treatment_record_id: string;
  compliance_status: string;
  rule_version: string;
  parameter_results: ComplianceParameterResult[] | Record<string, unknown>;
  evaluated_at: string;
}

export interface ComplianceSummaryResponse {
  total_evaluations: number;
  compliant_count: number;
  non_compliant_count: number;
  compliance_rate_percent: number;
  cpcb_standard_version: string;
  recent_evaluations: Array<{
    compliance_result_id: string;
    treatment_record_id: string;
    compliance_status: string;
    parameter_results: unknown;
    evaluated_at: string;
  }>;
}

export interface TreatmentRecord {
  record_id: string;
  facility_id: string;
  period_start: string;
  period_end: string;
  record_version: number;
  record_state: string;
  quality_status: string;
  anomaly_status: string;
  compliance_status: string;
  canonical_hash: string | null;
  certificate_id: string | null;
  signature_id: string | null;
  anchor_status: string;
  supersedes_record_id: string | null;
  provenance: Record<string, unknown> | null;
  evidence_snapshot: Record<string, unknown> | null;
  created_at: string;
  finalized_at: string | null;
}

export interface TreatmentRecordFinalizeRequest {
  facility_id: string;
  period_start: string;
  period_end: string;
  key_id?: string;
}

export interface Certificate {
  certificate_id: string;
  record_id: string;
  certificate_version: string;
  issuer_identity: string;
  issued_at: string;
  compliance_summary: Record<string, unknown>;
  canonical_hash: string;
  signature_id: string;
  dlt_anchor_id: string | null;
  status: string;
  facility_id: string | null;
  period_start: string | null;
  period_end: string | null;
  quality_status: string | null;
  anomaly_status: string | null;
  compliance_status: string | null;
}

export type VerificationStageStatus = 'passed' | 'failed' | 'skipped' | string;

export interface VerificationStage {
  stage_name: string;
  status: VerificationStageStatus;
  details: Record<string, unknown>;
  latency_ms?: number | null;
}

export type VerificationVerdict =
  | 'VERIFIED'
  | 'TAMPER_DETECTED'
  | 'SIGNATURE_INVALID'
  | 'CERTIFICATE_INVALID'
  | 'DLT_MISMATCH'
  | 'RECORD_NOT_FOUND'
  | string;

export interface Verification {
  record_id: string;
  record_version: number | null;
  record_state: string | null;
  is_superseded: boolean;
  superseding_record_id: string | null;
  certificate_id: string | null;
  overall_verdict: VerificationVerdict;
  verification_timestamp: string;
  stages: Record<string, VerificationStage>;
  canonical_hash: string;
  dlt_tx_id: string | null;
  tamper_details: Record<string, unknown> | null;
}

export interface PublicKeyResponse {
  key_id: string;
  algorithm: string;
  curve: string;
  public_key_pem: string;
  fingerprint: string;
  status: string;
  created_at: string;
}

export interface VerifyProofRequest {
  canonical_payload: Record<string, unknown>;
  canonical_hash: string;
  signature: string;
  public_key_pem: string;
  key_id?: string;
}

export interface VerifyProofResponse {
  hash_valid: boolean;
  signature_valid: boolean;
  key_trusted: boolean;
  verdict: 'VALID' | 'INVALID';
  message: string;
}

export interface DLTAnchor {
  anchor_id: string;
  record_id: string;
  certificate_id: string | null;
  facility_id: string;
  event_timestamp: string;
  canonical_hash: string;
  compliance_status: string;
  signature_metadata: Record<string, unknown> | null;
  network_reference: Record<string, unknown> | null;
  anchor_status: 'pending' | 'submitted' | 'confirmed' | 'failed' | 'rejected' | string;
  transaction_id: string | null;
  block_number: number | null;
  anchored_at: string | null;
  created_at: string;
}

export interface DLTStatus {
  mode: 'FABRIC' | 'SIMULATION' | string;
  status: string;
  is_connected: boolean;
  distributed_ledger: boolean;
  simulation_only?: boolean;
  last_error?: string | null;
  peer_endpoint?: string | null;
  channel?: string | null;
  chaincode?: string | null;
  simulation_sequence?: number | null;
  simulated_entries_count?: number | null;
}

export interface DLTReconcileResponse {
  record_id: string;
  anchor_id: string;
  previous_status: string;
  current_status: string;
  transaction_id: string | null;
  ledger_mode: string;
  failure: string | null;
  reconciled: boolean;
}

export interface DLTBatchAnchorRequest {
  batch_id?: string;
  record_hashes: string[];
  record_ids?: string[];
  facility_id: string;
  key_id?: string;
}

export interface DLTBatchAnchorResponse {
  tx_id: string | null;
  simulation_reference?: string | null;
  block_number?: number | null;
  channel_id: string;
  chaincode: string;
  docType: string;
  batch_id: string;
  merkle_root: string;
  leaf_count: number;
  record_ids?: string[] | null;
  facility_id: string;
  signature_metadata?: Record<string, unknown> | null;
  timestamp: string;
  proofs: Record<string, unknown>;
  status: string;
  mode: string;
  distributed_ledger: boolean;
}

export interface DLTBatchVerifyRequest {
  batch_id: string;
  leaf_hash: string;
}

export interface DLTBatchVerifyResponse {
  batch_id: string;
  leaf_hash: string;
  verified: boolean;
  merkle_root: string | null;
  mode: string;
  distributed_ledger: boolean;
  message: string;
}

export interface Correction {
  correction_id: string;
  original_record_id: string;
  superseding_record_id: string | null;
  status: string;
  justification_code: string;
  reason: string;
  proposed_changes: Record<string, unknown>;
  proposer_id: string;
  authorized_by: string | null;
  authorized_at: string | null;
  created_at: string;
}

export interface CorrectionChainNode {
  record_id: string;
  record_version: number;
  record_state: string;
  canonical_hash: string | null;
  supersedes_record_id: string | null;
  correction_id: string | null;
  created_at: string;
}

export interface CorrectionChainResponse {
  original_record_id: string;
  total_versions: number;
  chain: CorrectionChainNode[];
  record_id?: string;
  chain_length?: number;
  lineage?: CorrectionChainNode[];
}

export interface ProposeCorrectionRequest {
  original_record_id: string;
  reason: string;
  justification_code: string;
  corrected_parameters: Record<string, unknown>;
  supporting_evidence_url?: string;
  proposer_id?: string;
}

export interface AuthorizeCorrectionRequest {
  authorized_by?: string;
  comments?: string;
  key_id?: string;
}

export interface AuditEvent {
  audit_log_id: string;
  timestamp: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  outcome: string;
  details: Record<string, unknown> | null;
}

export interface AuditLogListResponse {
  total_count: number;
  logs: AuditEvent[];
}

export interface SimulatorStartRequest {
  facility_id?: string;
  facility_name?: string;
  facility_type?: string;
  interval_seconds?: number;
  seed?: number;
  auto_ingest?: boolean;
  use_http_bridge?: boolean;
  bridge_endpoint?: string;
}

export interface SimulatorStatus {
  is_running: boolean;
  active_facility_id: string | null;
  active_facility_name: string | null;
  steps_generated: number;
  readings_ingested: number;
  current_scenario: string;
  use_http_bridge: boolean;
  last_tick_at: string | null;
}

export interface AnomalyInjectionRequest {
  scenario_id: string;
  severity?: number;
  duration_steps?: number;
}

export interface WebSocketTelemetryMessage {
  type: string;
  timestamp: string;
  status: SimulatorStatus;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | string;
  app_name: string;
  environment: string;
  version: string;
  timestamp: string;
  database: 'connected' | 'disconnected' | string;
}

export interface ApiErrorPayload {
  error_code?: string;
  message?: string;
  detail?: string | Array<{ msg: string; loc?: string[] }>;
  details?: unknown;
  request_id?: string;
}
