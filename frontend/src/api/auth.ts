import { apiClient } from './client';
import { LoginResponse, UserProfileResponse, UserRegisterRequest } from '../types';

export interface LoginParams {
  username: string;
  password: string;
}

export async function loginApi(params: LoginParams): Promise<LoginResponse> {
  return apiClient<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function logoutApi(): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/auth/logout', {
    method: 'POST',
  });
}

export async function getMeApi(): Promise<UserProfileResponse> {
  return apiClient<UserProfileResponse>('/auth/me', {
    method: 'GET',
  });
}

export async function registerUserApi(payload: UserRegisterRequest): Promise<UserProfileResponse> {
  return apiClient<UserProfileResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
