import { apiClient } from './client';
import { Facility, FacilityCreate, Reading, Sensor } from '../types';

export interface FacilityReadingsQuery {
  parameter?: string;
  start_time?: string;
  end_time?: string;
  quality_status?: string;
  skip?: number;
  limit?: number;
}

export async function listFacilitiesApi(): Promise<Facility[]> {
  return apiClient<Facility[]>('/facilities', {
    method: 'GET',
  });
}

export async function getFacilityApi(facilityId: string): Promise<Facility> {
  return apiClient<Facility>(`/facilities/${facilityId}`, {
    method: 'GET',
  });
}

export async function createFacilityApi(payload: FacilityCreate): Promise<Facility> {
  return apiClient<Facility>('/facilities', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getFacilityReadingsApi(
  facilityId: string,
  query?: FacilityReadingsQuery
): Promise<Reading[]> {
  return apiClient<Reading[]>(`/facilities/${facilityId}/readings`, {
    method: 'GET',
    params: query as Record<string, string | number | undefined>,
  });
}

export async function getFacilitySensorsApi(facilityId: string): Promise<Sensor[]> {
  return apiClient<Sensor[]>(`/facilities/${facilityId}/sensors`, {
    method: 'GET',
  });
}

export interface SensorCreatePayload {
  parameter: string;
  unit: string;
  treatment_stage?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export async function createFacilitySensorApi(
  facilityId: string,
  payload: SensorCreatePayload
): Promise<Sensor> {
  return apiClient<Sensor>(`/facilities/${facilityId}/sensors`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function provisionFacilityDefaultSensorsApi(
  facilityId: string
): Promise<Sensor[]> {
  return apiClient<Sensor[]>(`/facilities/${facilityId}/sensors/provision-defaults`, {
    method: 'POST',
  });
}

export async function provisionAllFacilitiesSensorsApi(): Promise<{
  status: string;
  facilities_provisioned: number;
  message: string;
}> {
  return apiClient<{ status: string; facilities_provisioned: number; message: string }>(
    '/facilities/provision-all-sensors',
    {
      method: 'POST',
    }
  );
}
