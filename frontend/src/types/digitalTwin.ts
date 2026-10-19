/**
 * AquaTrust AI — Digital Twin Frontend Type Definitions
 * Matches backend Pydantic schemas in app/digital_twin/schemas.py
 */

export type DataOrigin = 'observed' | 'simulated' | 'predicted' | 'hypothetical';
export type StateFreshness = 'fresh' | 'stale' | 'expired';
export type DataQuality = 'valid' | 'suspect' | 'invalid' | 'insufficient_data';
export type ComplianceRisk = 'compliant' | 'non_compliant' | 'insufficient_data';

export interface StageParameterValue {
  value: number | null;
  unit?: string;
  source?: string;
  quality_status?: string;
}

export interface StageState {
  stage_id?: string;
  stage_name: string;
  sequence_order?: number;
  parameters: Record<string, number | StageParameterValue>;
  removal_efficiencies?: Record<string, number>;
  operating_variables?: Record<string, number | string>;
}

export interface ObservationValue {
  value: number | null;
  unit: string;
  observed_at?: string;
  data_origin: DataOrigin;
}

export interface TwinState {
  state_id?: string;
  facility_id: string;
  state_version: number;
  observed_at: string;
  source_mode: 'live' | 'replay' | 'simulated' | string;
  facility_profile_version: string;
  stage_states: Record<string, StageState>;
  sensor_states?: Record<string, unknown>;
  operating_variables?: Record<string, number | string> | null;
  data_quality: DataQuality;
  state_freshness: StateFreshness;
  last_accepted_observation_at?: string | null;
  latest_received_observation_at?: string | null;
  latest_observations?: Record<string, ObservationValue>;
  process_model?: {
    version?: string;
    configuration_hash?: string;
    status?: string;
    overall_removal_efficiencies?: Record<string, number>;
  };
  engine_status?: TwinEngineStatus;
}

export interface TwinConfig {
  config_id: string;
  facility_id: string;
  version: number;
  facility_profile_version: string;
  technology_type: string;
  treatment_stages: unknown[];
  sensors_config: Record<string, unknown>;
  operating_variables: Record<string, unknown>;
  model_version: string;
  is_active: boolean;
  created_at: string;
}

export interface ScenarioCreateRequest {
  scenario_type: 'influent_quality_change' | 'aeration_failure' | 'chemical_overdosing' | 'hydraulic_surge';
  scenario_name?: string;
  duration_minutes?: number;
  time_step_seconds?: number;
  base_state_version?: number;
  parameters?: Record<string, unknown>;
  seed?: number;
}

export interface ScenarioResultStep {
  step_index: number;
  simulation_timestamp: string;
  treatment_stage: string;
  parameter: string;
  baseline_value: number | null;
  scenario_value: number | null;
  unit: string;
  estimated_compliance_status: ComplianceRisk;
  uncertainty_interval?: { lower: number; upper: number };
  data_origin: 'hypothetical';
}

export interface ScenarioResponse {
  scenario_id: string;
  facility_id: string;
  base_state_version: number;
  scenario_type: string;
  scenario_name?: string;
  status: 'running' | 'completed' | 'failed';
  parameters: Record<string, unknown>;
  duration_minutes: number;
  time_step_seconds: number;
  random_seed?: number;
  model_version: string;
  created_by?: string;
  created_at: string;
  completed_at?: string;
  error_details?: string;
  comparison_summary?: {
    total_steps: number;
    non_compliant_steps_count: number;
    compliance_risk_detected: boolean;
    max_scenario_bod?: number;
    max_baseline_bod?: number;
  };
  results: ScenarioResultStep[];
}

export interface ScenarioListResponse {
  total: number;
  limit: number;
  offset: number;
  scenarios: ScenarioResponse[];
}

export interface TwinPrediction {
  prediction_id: string;
  facility_id: string;
  base_state_version: number;
  model_version: string;
  horizon_hours: number;
  status: 'ready' | 'insufficient_data';
  predicted_values: Record<
    string,
    {
      value: number;
      unit: string;
      horizon_hours: number;
      data_origin: string;
    }
  >;
  uncertainty_bounds: Record<
    string,
    {
      lower_bound: number;
      upper_bound: number;
      confidence_level: number;
      model_rmse: number;
    }
  >;
  input_features?: Record<string, number>;
  created_at: string;
}

export interface TwinRecommendation {
  recommendation_id: string;
  facility_id: string;
  scenario_id?: string;
  recommendation_type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggested_action: string;
  expected_outcome: string;
  evidence: string[];
  limitations: string[];
  requires_human_approval: boolean;
  status: 'active' | 'acknowledged' | 'dismissed';
  created_at: string;
}

export interface TwinSustainability {
  facility_id: string;
  evaluated_at: string;
  capacity_mld: number;
  reuse_volume_m3_day: number;
  freshwater_displacement_m3_day: number;
  annual_freshwater_saved_m3: number;
  safe_reuse_gate: 'PASSED' | 'HELD';
  safe_reuse_eligible: boolean;
  reuse_applications: string[];
  effluent_quality_summary: {
    bod?: number;
    cod?: number;
    tss?: number;
    ph?: number;
    data_quality?: string;
  };
}

export interface TwinModelVersion {
  model_id: string;
  model_name: string;
  model_type: string;
  version: string;
  configuration_hash: string;
  parameters: Record<string, unknown>;
  validation_status: string;
  validation_metrics?: Record<string, unknown>;
  created_at: string;
}

export type TwinLifecycleState = 'stopped' | 'starting' | 'running' | 'paused' | 'error';
export type TwinOperatingMode = 'live' | 'simulation' | 'historical_replay' | 'scenario';
export type AlarmSeverity = 'critical' | 'warning' | 'info';
export type AlarmStatus = 'active' | 'acknowledged' | 'resolved';

export interface TwinEngineStatus {
  facility_id?: string;
  facility_name?: string;
  lifecycle_state: TwinLifecycleState;
  operating_mode: TwinOperatingMode | string;
  interval_seconds: number;
  tick_count: number;
  active_state_version: number;
  last_tick_at: string | null;
  current_scenario: string;
  is_paused?: boolean;
  is_healthy?: boolean;
  error_message?: string | null;
}

export interface TwinAlarmEvent {
  alarm_id: string;
  facility_id: string;
  stage_id: string;
  stage_name: string;
  parameter: string;
  severity: AlarmSeverity;
  alarm_type?: string;
  message: string;
  observed_value: number | null;
  threshold_value: number | null;
  unit: string;
  acknowledged: boolean;
  first_seen_at: string;
  last_updated_at: string;
  status: AlarmStatus;
}

export interface TwinSnapshotMessage {
  type: 'TWIN_SNAPSHOT';
  facility_id: string;
  state_version: number;
  observed_at: string;
  source_mode: string;
  data_quality: DataQuality;
  state_freshness: StateFreshness;
  stage_states: Record<string, StageState>;
  latest_observations?: Record<string, ObservationValue>;
  operating_variables?: Record<string, number | string> | null;
  active_alarms: TwinAlarmEvent[];
  engine_status?: TwinEngineStatus;
  timestamp: string;
}

export interface TwinStateDeltaMessage {
  type: 'TWIN_STATE_DELTA';
  facility_id: string;
  state_version: number;
  observed_at: string;
  source_mode: string;
  data_quality: DataQuality;
  state_freshness: StateFreshness;
  stage_states: Record<string, StageState>;
  latest_observations?: Record<string, ObservationValue>;
  operating_variables?: Record<string, number | string> | null;
  active_alarms: TwinAlarmEvent[];
  engine_status?: TwinEngineStatus;
  timestamp: string;
}

export interface TwinAlarmAcknowledgedMessage {
  type: 'TWIN_ALARM_ACKNOWLEDGED';
  alarm_id: string;
  acknowledged_at?: string;
  alarm?: TwinAlarmEvent;
}

export interface TwinHeartbeatMessage {
  type: 'HEARTBEAT';
  timestamp: string;
}

export type TwinWebSocketMessage =
  | TwinSnapshotMessage
  | TwinStateDeltaMessage
  | TwinAlarmAcknowledgedMessage
  | TwinHeartbeatMessage;

