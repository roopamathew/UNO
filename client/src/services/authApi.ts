import type { AuthResponse, LoginRequest, RegisterRequest, UserProfile } from '@uno/shared';
import { API_ROUTES } from '@uno/shared';
import { api } from './api';

export const authApi = {
  register: (data: RegisterRequest) =>
    api.post<AuthResponse>(API_ROUTES.AUTH.REGISTER, data),

  login: (data: LoginRequest) =>
    api.post<AuthResponse>(API_ROUTES.AUTH.LOGIN, data),

  logout: (refreshToken: string) =>
    api.post(API_ROUTES.AUTH.LOGOUT, { refreshToken }),

  refresh: (refreshToken: string) =>
    api.post<AuthResponse>(API_ROUTES.AUTH.REFRESH, { refreshToken }),

  forgotPassword: (email: string) =>
    api.post<{ message: string; resetToken?: string }>(API_ROUTES.AUTH.FORGOT_PASSWORD, { email }),

  resetPassword: (token: string, password: string) =>
    api.post(API_ROUTES.AUTH.RESET_PASSWORD, { token, password }),

  me: (token: string) =>
    api.get<{ user: UserProfile; stats: unknown; settings: unknown }>(API_ROUTES.AUTH.ME, token),
};
