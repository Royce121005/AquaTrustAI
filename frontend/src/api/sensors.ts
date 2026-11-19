/**
 * AquaTrust AI — Sensors API Client
 * Connects to Member 2 Phase 2 Sensor Health & Calibration Endpoints.
 */

import { apiClient } from './client';

export interface SensorHealthItem {
  sensor_id: string;
  facility_id: string;
  parameter: string;
  unit: string;
  treatment_stage?: string | null;
  status: string;
  calibration_status: 'calibrated' | 'due' | 'overdue' | string;
  last_calibrated_at?: string | null;
  days_since_calibration?: number | null;
  is_calibration_due: boolean;
  drift_flag: boolean;
  health_score: number;
  diagnostic_message: string;
}

export interface SensorHealthResponse {
  facility_id: string;
  evaluated_at: string;
  total_sensors: number;
  healthy_sensors: number;
  drift_flagged_sensors: number;
  overdue_calibration_sensors: number;
  overall_health_index: number;
  sensors: SensorHealthItem[];
}

export interface SensorCalibrationRequest {
  sensor_id: string;
  calibration_type?: string;
  performed_by?: string | null;
  notes?: string | null;
}

export interface SensorCalibrationResponse {
  sensor_id: string;
  facility_id: string;
  parameter: string;
  calibration_status: string;
  calibrated_at: string;
  drift_flag: boolean;
  status: string;
  message: string;
}

export async function getSensorHealthApi(
  facilityId: string
): Promise<SensorHealthResponse> {
  return apiClient<SensorHealthResponse>('/sensors/health', {
    method: 'GET',
    params: { facility_id: facilityId },
  });
}

export async function calibrateSensorApi(
  payload: SensorCalibrationRequest
): Promise<SensorCalibrationResponse> {
  return apiClient<SensorCalibrationResponse>('/sensors/calibration', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
}
