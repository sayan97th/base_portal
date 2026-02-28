import { apiClient, setToken, removeToken } from "@/lib/api-client";
import type {
  AuthResponse,
  LoginCredentials,
  MeResponse,
  RegisterData,
} from "@/types/auth";

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>("/api/auth/login", credentials);
    setToken(data.access_token);
    const expiresAt = Date.now() + data.expires_in * 1000;
    localStorage.setItem("token_expires_at", expiresAt.toString());
    return data;
  },

  async register(registerData: RegisterData): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>("/api/auth/register", registerData);
    setToken(data.access_token);
    const expiresAt = Date.now() + data.expires_in * 1000;
    localStorage.setItem("token_expires_at", expiresAt.toString());
    return data;
  },

  async getMe(): Promise<MeResponse> {
    return apiClient.get<MeResponse>("/api/auth/me");
  },

  async refresh(): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>("/api/auth/refresh");
    setToken(data.access_token);
    const expiresAt = Date.now() + data.expires_in * 1000;
    localStorage.setItem("token_expires_at", expiresAt.toString());
    return data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/api/auth/logout");
    } finally {
      removeToken();
    }
  },
};
