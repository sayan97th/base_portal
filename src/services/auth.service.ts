import { apiClient, setToken, removeToken } from "@/lib/api-client";
import { getPrimaryRole, setPrimaryRoleCookie } from "@/lib/roles";
import type {
  AuthResponse,
  ForgotPasswordData,
  ForgotPasswordResponse,
  LoginCredentials,
  MeResponse,
  RegisterData,
  ResetPasswordData,
  ResetPasswordResponse,
} from "@/types/auth";

function persistSession(data: AuthResponse): void {
  setToken(data.access_token);
  const expiresAt = Date.now() + data.expires_in * 1000;
  localStorage.setItem("token_expires_at", expiresAt.toString());
  const primary_role = getPrimaryRole(data.user.roles);
  setPrimaryRoleCookie(primary_role);
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>("/api/auth/login", credentials);
    persistSession(data);
    return data;
  },

  async register(registerData: RegisterData): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>("/api/auth/register", registerData);
    persistSession(data);
    return data;
  },

  async getMe(): Promise<MeResponse> {
    return apiClient.get<MeResponse>("/api/auth/me");
  },

  async refresh(): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>("/api/auth/refresh");
    persistSession(data);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/api/auth/logout");
    } finally {
      removeToken();
      setPrimaryRoleCookie(null);
    }
  },

  async forgotPassword(data: ForgotPasswordData): Promise<ForgotPasswordResponse> {
    return apiClient.post<ForgotPasswordResponse>("/api/auth/forgot-password", data);
  },

  async resetPassword(data: ResetPasswordData): Promise<ResetPasswordResponse> {
    return apiClient.post<ResetPasswordResponse>("/api/auth/reset-password", data);
  },
};
