import { apiClient, setToken, getToken, removeToken } from "@/lib/api-client";
import { getPrimaryRole, isStaffRole, setPrimaryRoleCookie, ROLES } from "@/lib/roles";
import type { ImpersonationResponse, ImpersonationMeta } from "@/types/auth";

const ADMIN_TOKEN_KEY = "impersonation_admin_token";
const ADMIN_EXPIRES_KEY = "impersonation_admin_expires_at";
const IMPERSONATION_META_KEY = "impersonation_meta";

/**
 * Persists the outcome of a successful impersonation call (token swap, role
 * cookie, banner metadata). Shared by every entry point that can start an
 * impersonation session, the general admin-panel flow and the notification
 * redirect gate, so the client-side session state behaves identically no
 * matter which screen triggered it.
 */
function applyImpersonationSession(data: ImpersonationResponse): void {
  const admin_token = getToken();
  const admin_expires_at =
    typeof window !== "undefined"
      ? localStorage.getItem("token_expires_at")
      : null;

  if (admin_token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, admin_token);
  }
  if (admin_expires_at) {
    localStorage.setItem(ADMIN_EXPIRES_KEY, admin_expires_at);
  }

  // Derive the impersonated account's primary role so routing and the
  // role cookie reflect who we are now acting as (client vs admin-side user).
  const target_role = getPrimaryRole(data.impersonated_user.roles) ?? ROLES.CLIENT;
  const target_is_staff = isStaffRole(target_role);

  const meta: ImpersonationMeta = {
    admin_id: data.admin_user.id,
    admin_first_name: data.admin_user.first_name,
    admin_last_name: data.admin_user.last_name,
    admin_email: data.admin_user.email,
    target_id: data.impersonated_user.id,
    target_first_name: data.impersonated_user.first_name,
    target_last_name: data.impersonated_user.last_name,
    target_email: data.impersonated_user.email,
    target_role,
    target_is_staff,
    started_at: new Date().toISOString(),
  };
  localStorage.setItem(IMPERSONATION_META_KEY, JSON.stringify(meta));

  setToken(data.impersonation_token);
  const expires_at = Date.now() + data.expires_in * 1000;
  localStorage.setItem("token_expires_at", expires_at.toString());
  setPrimaryRoleCookie(target_role);
}

export const impersonationService = {
  async startImpersonation(user_id: number): Promise<ImpersonationResponse> {
    const data = await apiClient.post<ImpersonationResponse>(
      `/api/admin/users/${user_id}/impersonate`
    );
    applyImpersonationSession(data);
    return data;
  },

  /**
   * Starts an impersonation session using an already-issued impersonation
   * response, e.g. one obtained through the notification redirect gate's own
   * scoped endpoint (see notificationRedirectService.impersonate). Keeps the
   * token/role/banner bookkeeping in this single place instead of duplicating
   * it at every call site.
   */
  applyImpersonationResponse(data: ImpersonationResponse): void {
    applyImpersonationSession(data);
  },

  /**
   * Landing path to redirect to after starting an impersonation session,
   * based on the impersonated account's primary role.
   */
  getLandingPath(target_is_staff: boolean): string {
    return target_is_staff ? "/admin/dashboard" : "/";
  },

  async stopImpersonation(): Promise<void> {
    try {
      await apiClient.post("/api/admin/impersonation/stop");
    } catch {
      // Always restore the admin token even if the API call fails
    }

    const admin_token = localStorage.getItem(ADMIN_TOKEN_KEY);
    const admin_expires_at = localStorage.getItem(ADMIN_EXPIRES_KEY);

    if (admin_token) {
      setToken(admin_token);
    } else {
      removeToken();
    }

    if (admin_expires_at) {
      localStorage.setItem("token_expires_at", admin_expires_at);
    } else {
      localStorage.removeItem("token_expires_at");
    }

    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_EXPIRES_KEY);
    localStorage.removeItem(IMPERSONATION_META_KEY);

    setPrimaryRoleCookie("admin");
  },

  isImpersonating(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(ADMIN_TOKEN_KEY);
  },

  getImpersonationMeta(): ImpersonationMeta | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(IMPERSONATION_META_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ImpersonationMeta;
    } catch {
      return null;
    }
  },

  clearImpersonation(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_EXPIRES_KEY);
    localStorage.removeItem(IMPERSONATION_META_KEY);
  },
};
