"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { authService } from "@/services/auth.service";
import { getToken } from "@/lib/api-client";
import { resetEcho } from "@/lib/echo";
import { getPrimaryRole, isStaffRole, setPrimaryRoleCookie } from "@/lib/roles";
import type { RoleName } from "@/lib/roles";
import type { User, AuthResponse, LoginCredentials, RegisterData, ApiError } from "@/types/auth";

export type LoginResult =
  | { requires_two_factor: false }
  | { requires_two_factor: true; two_factor_token: string };

type AuthContextType = {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True when the current user belongs to the internal staff team. */
  isStaff: boolean;
  /** True when the current user has super_admin or admin role. */
  isAdmin: boolean;
  /** Returns true when the user has ALL of the given roles. */
  hasRole: (...roles: RoleName[]) => boolean;
  /** Returns true when the user has ALL of the given permissions. */
  hasPermission: (...perms: string[]) => boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  loginWithTwoFactor: (two_factor_token: string, code: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived role helpers ──────────────────────────────────────────────────

  const getUserRoleNames = useCallback((): string[] => {
    if (!user?.roles) return [];
    return user.roles.map((r) => (typeof r === "string" ? r : r.name));
  }, [user]);

  const hasRole = useCallback(
    (...roles: RoleName[]): boolean => {
      const user_roles = getUserRoleNames();
      return roles.every((r) => user_roles.includes(r));
    },
    [getUserRoleNames]
  );

  const hasPermission = useCallback(
    (...perms: string[]): boolean => perms.every((p) => permissions.includes(p)),
    [permissions]
  );

  const primary_role = user ? getPrimaryRole(user.roles) : null;
  const isStaffUser = primary_role ? isStaffRole(primary_role) : false;
  const isAdminUser =
    primary_role === "super_admin" || primary_role === "admin";

  // ── Token refresh scheduling ──────────────────────────────────────────────

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const expiresAt = localStorage.getItem("token_expires_at");
    if (!expiresAt) return;

    const expiresIn = parseInt(expiresAt) - Date.now();
    const refreshIn = Math.max(expiresIn - 5 * 60 * 1000, 0);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const data = await authService.refresh();
        setUser(data.user);
        scheduleRefresh();
      } catch {
        setUser(null);
        setPermissions([]);
        setPrimaryRoleCookie(null);
      }
    }, refreshIn);
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────────

  const initAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await authService.getMe();
      setUser(data.user);
      setPermissions(data.permissions);
      // Ensure the role cookie is always in sync on page load.
      setPrimaryRoleCookie(getPrimaryRole(data.user.roles));
      scheduleRefresh();
    } catch {
      setUser(null);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [scheduleRefresh]);

  useEffect(() => {
    initAuth();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [initAuth]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const login = async (credentials: LoginCredentials): Promise<LoginResult> => {
    const data = await authService.login(credentials);

    // 2FA challenge — return the temp token so the UI can show the OTP step.
    if ("requires_two_factor" in data && data.requires_two_factor) {
      return { requires_two_factor: true, two_factor_token: data.two_factor_token };
    }

    const auth_data = data as AuthResponse;
    setUser(auth_data.user);
    try {
      const meData = await authService.getMe();
      setPermissions(meData.permissions);
    } catch {
      // permissions remain empty if /me fails
    }
    scheduleRefresh();
    return { requires_two_factor: false };
  };

  const loginWithTwoFactor = async (two_factor_token: string, code: string): Promise<void> => {
    const data = await authService.loginWithTwoFactor({ two_factor_token, code });
    setUser(data.user);
    try {
      const meData = await authService.getMe();
      setPermissions(meData.permissions);
    } catch {
      // permissions remain empty if /me fails
    }
    scheduleRefresh();
  };

  const register = async (registerData: RegisterData) => {
    const data = await authService.register(registerData);
    setUser(data.user);
    try {
      const meData = await authService.getMe();
      setPermissions(meData.permissions);
    } catch {
      // permissions remain empty if /me fails
    }
    scheduleRefresh();
  };

  const refreshUser = async () => {
    try {
      const data = await authService.getMe();
      setUser(data.user);
      setPermissions(data.permissions);
      setPrimaryRoleCookie(getPrimaryRole(data.user.roles));
    } catch {
      // keep current state if refresh fails
    }
  };

  const logout = async () => {
    // Disconnect WebSocket before clearing the token so no stale subscriptions
    // persist across sessions.
    resetEcho();
    await authService.logout();
    setUser(null);
    setPermissions([]);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        isStaff: isStaffUser,
        isAdmin: isAdminUser,
        hasRole,
        hasPermission,
        login,
        loginWithTwoFactor,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export type { ApiError };
