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
