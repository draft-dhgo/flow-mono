import { apiClient } from './client';
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  AuthUser,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from './types';

export const authApi = {
  login: (data: LoginRequest) => apiClient.post<unknown, AuthResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<unknown, { userId: string; username: string }>('/auth/register', data),

  refresh: (data: RefreshTokenRequest) =>
    apiClient.post<unknown, RefreshTokenResponse>('/auth/refresh', data),

  me: () => apiClient.get<unknown, AuthUser>('/auth/me'),
};
