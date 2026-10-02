import { apiClient, getApiBaseUrl, getStoredToken } from './client';
import {
  SimulatorStartRequest,
  SimulatorStatus,
  AnomalyInjectionRequest,
} from '../types';

export async function startSimulatorApi(payload?: SimulatorStartRequest): Promise<Record<string, unknown>> {
  return apiClient<Record<string, unknown>>('/simulator/start', {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}

export async function stopSimulatorApi(): Promise<Record<string, unknown>> {
  return apiClient<Record<string, unknown>>('/simulator/stop', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getSimulatorStatusApi(): Promise<SimulatorStatus> {
  return apiClient<SimulatorStatus>('/simulator/status', {
    method: 'GET',
  });
}

export async function injectAnomalyApi(payload: AnomalyInjectionRequest): Promise<Record<string, unknown>> {
  return apiClient<Record<string, unknown>>('/simulator/inject-anomaly', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getSimulatorWebSocketUrl(): string {
  const baseUrl = getApiBaseUrl();
  const token = getStoredToken() || '';
  const wsProto = baseUrl.startsWith('https') ? 'wss:' : 'ws:';
  const cleanBase = baseUrl.replace(/^https?:\/\//, '');
  return `${wsProto}//${cleanBase}/simulator/stream?token=${encodeURIComponent(token)}`;
}
