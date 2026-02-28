"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { authService } from "@/services/auth.service";
import { getToken } from "@/lib/api-client";
import type { User, LoginCredentials, RegisterData, ApiError } from "@/types/auth";

type AuthContextType = {
  user: User | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    const expiresAt = localStorage.getItem("token_expires_at");
    if (!expiresAt) return;

    const expiresIn = parseInt(expiresAt) - Date.now();
    // Refresh 5 minutes before expiry
    const refreshIn = Math.max(expiresIn - 5 * 60 * 1000, 0);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const data = await authService.refresh();
        setUser(data.user);
        scheduleRefresh();
      } catch {
        setUser(null);
        setPermissions([]);
      }
    }, refreshIn);
  }, []);

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
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [initAuth]);

  const login = async (credentials: LoginCredentials) => {
    const data = await authService.login(credentials);
    setUser(data.user);
    // Fetch full permissions after login
    try {
      const meData = await authService.getMe();
      setPermissions(meData.permissions);
    } catch {
      // permissions will be empty if /me fails
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
      // permissions will be empty if /me fails
    }
    scheduleRefresh();
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setPermissions([]);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
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
