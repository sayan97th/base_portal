import { apiClient, setToken, removeToken, setTokenExpiry, isRemembered } from "@/lib/api-client";
import { getPrimaryRole, setPrimaryRoleCookie } from "@/lib/roles";
import type {
  AuthResponse,
  LoginResponse,
  TwoFactorChallengeData,
  ForgotPasswordData,
  ForgotPasswordResponse,
  LoginCredentials,
  MeResponse,
  RegisterData,
  ResetPasswordData,
  ResetPasswordResponse,
} from "@/types/auth";

function persistSession(data: AuthResponse, remember_me: boolean = true): void {
  setToken(data.access_token, remember_me);
  setTokenExpiry((Date.now() + data.expires_in * 1000).toString(), remember_me);
  setPrimaryRoleCookie(getPrimaryRole(data.user.roles), remember_me);
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const data = await apiClient.post<LoginResponse>("/api/auth/login", credentials);
    // Only persist the session when 2FA is not required.
    if (!("requires_two_factor" in data && data.requires_two_factor)) {
      persistSession(data as AuthResponse, credentials.remember_me ?? false);
    }
    return data;
  },

  async loginWithTwoFactor(data: TwoFactorChallengeData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/api/auth/2fa-challenge", data);
    persistSession(response, data.remember_me ?? false);
    return response;
  },

  async register(registerData: RegisterData): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>("/api/auth/register", registerData);
    // Registration always creates a persistent session.
    persistSession(data, true);
    return data;
  },

  async getMe(): Promise<MeResponse> {
    return apiClient.get<MeResponse>("/api/auth/me");
  },

  async refresh(): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>("/api/auth/refresh");
    // Preserve the original remember-me preference when refreshing.
    persistSession(data, isRemembered());
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
