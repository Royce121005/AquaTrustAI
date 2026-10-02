import { apiClient, getApiBaseUrl } from './client';
import { HealthResponse } from '../types';

export async function getHealthApi(): Promise<HealthResponse> {
  // Try /health on the root API base or relative to server root
  const baseUrl = getApiBaseUrl();
  const rootUrl = baseUrl.replace(/\/api\/v1\/?$/, '');
  const target = `${rootUrl}/health`;

  const response = await fetch(target, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Health check returned HTTP ${response.status}`);
  }

  return (await response.json()) as HealthResponse;
}
