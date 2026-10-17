import { apiClient, getApiBaseUrl, getStoredToken } from './client';
import {
  TwinState,
  TwinConfig,
  ScenarioCreateRequest,
  ScenarioResponse,
  ScenarioListResponse,
  TwinPrediction,
  TwinRecommendation,
  TwinSustainability,
  TwinModelVersion,
  TwinEngineStatus,
  TwinAlarmEvent,
} from '../types/digitalTwin';

export async function getFacilityTwinStateApi(facilityId: string): Promise<TwinState> {
  return apiClient<TwinState>(`/facilities/${facilityId}/twin`, {
    method: 'GET',
  });
}

export async function getFacilityTwinHistoryApi(
  facilityId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ total: number; limit: number; offset: number; history: TwinState[] }> {
  return apiClient<{ total: number; limit: number; offset: number; history: TwinState[] }>(
    `/facilities/${facilityId}/twin/history`,
    {
      method: 'GET',
      params: { limit, offset },
    }
  );
}

export async function getFacilityTwinConfigApi(facilityId: string): Promise<TwinConfig> {
  return apiClient<TwinConfig>(`/facilities/${facilityId}/twin/config`, {
    method: 'GET',
  });
}

export async function updateFacilityTwinConfigApi(
  facilityId: string,
  payload: Partial<TwinConfig>
): Promise<TwinConfig> {
  return apiClient<TwinConfig>(`/facilities/${facilityId}/twin/config`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function runScenarioApi(
  facilityId: string,
  payload: ScenarioCreateRequest
): Promise<ScenarioResponse> {
  return apiClient<ScenarioResponse>(`/facilities/${facilityId}/twin/scenarios`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getScenarioApi(scenarioId: string): Promise<ScenarioResponse> {
  return apiClient<ScenarioResponse>(`/twin/scenarios/${scenarioId}`, {
    method: 'GET',
  });
}

export async function listFacilityScenariosApi(
  facilityId: string,
  limit: number = 20,
  offset: number = 0
): Promise<ScenarioListResponse> {
  return apiClient<ScenarioListResponse>(`/facilities/${facilityId}/twin/scenarios`, {
    method: 'GET',
    params: { limit, offset },
  });
}

export async function getFacilityPredictionsApi(facilityId: string): Promise<TwinPrediction> {
  return apiClient<TwinPrediction>(`/facilities/${facilityId}/twin/predictions`, {
    method: 'GET',
  });
}

export async function getFacilityRecommendationsApi(
  facilityId: string
): Promise<TwinRecommendation[]> {
  return apiClient<TwinRecommendation[]>(`/facilities/${facilityId}/twin/recommendations`, {
    method: 'GET',
  });
}

export async function getFacilitySustainabilityApi(
  facilityId: string,
  treatedFlow?: number
): Promise<TwinSustainability> {
  return apiClient<TwinSustainability>(`/facilities/${facilityId}/twin/sustainability`, {
    method: 'GET',
    params: treatedFlow !== undefined ? { daily_treated_flow_m3: treatedFlow } : undefined,
  });
}

export async function listTwinModelsApi(): Promise<TwinModelVersion[]> {
  return apiClient<TwinModelVersion[]>('/twin/models', {
    method: 'GET',
  });
}

export async function evaluateTwinModelApi(datasetPath?: string): Promise<Record<string, unknown>> {
  return apiClient<Record<string, unknown>>('/twin/models/evaluate', {
    method: 'POST',
    params: datasetPath ? { dataset_path: datasetPath } : undefined,
  });
}

export async function startTwinEngineApi(
  facilityId: string,
  payload?: { interval_seconds?: number; operating_mode?: string; seed?: number }
): Promise<{ status: string; worker?: TwinEngineStatus }> {
  return apiClient<{ status: string; worker?: TwinEngineStatus }>(
    `/facilities/${facilityId}/twin/engine/start`,
    {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }
  );
}

export async function stopTwinEngineApi(
  facilityId: string
): Promise<{ status: string; worker?: TwinEngineStatus }> {
  return apiClient<{ status: string; worker?: TwinEngineStatus }>(
    `/facilities/${facilityId}/twin/engine/stop`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
}

export async function pauseTwinEngineApi(
  facilityId: string
): Promise<{ status: string; worker?: TwinEngineStatus }> {
  return apiClient<{ status: string; worker?: TwinEngineStatus }>(
    `/facilities/${facilityId}/twin/engine/pause`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
}

export async function resumeTwinEngineApi(
  facilityId: string
): Promise<{ status: string; worker?: TwinEngineStatus }> {
  return apiClient<{ status: string; worker?: TwinEngineStatus }>(
    `/facilities/${facilityId}/twin/engine/resume`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    }
  );
}

export async function getTwinEngineStatusApi(
  facilityId: string
): Promise<TwinEngineStatus> {
  return apiClient<TwinEngineStatus>(`/facilities/${facilityId}/twin/engine/status`, {
    method: 'GET',
  });
}

export async function getTwinAlarmsApi(
  facilityId: string
): Promise<TwinAlarmEvent[]> {
  return apiClient<TwinAlarmEvent[]>(`/facilities/${facilityId}/twin/alarms`, {
    method: 'GET',
  });
}

export async function acknowledgeTwinAlarmApi(
  facilityId: string,
  alarmId: string
): Promise<TwinAlarmEvent> {
  return apiClient<TwinAlarmEvent>(`/facilities/${facilityId}/twin/alarms/${alarmId}/ack`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function getTwinWebSocketUrl(facilityId: string): string {
  const baseUrl = getApiBaseUrl();
  const token = getStoredToken() || '';
  const wsProto = baseUrl.startsWith('https') ? 'wss:' : 'ws:';
  const cleanBase = baseUrl.replace(/^https?:\/\//, '');
  return `${wsProto}//${cleanBase}/facilities/${facilityId}/twin/stream?token=${encodeURIComponent(token)}`;
}

