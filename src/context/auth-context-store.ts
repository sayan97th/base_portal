"use client";

/**
 * Bare auth context object, kept apart from AuthContext.tsx so that widgets
 * which only read the current user (for example to prefill an email) do not
 * pull in the provider side effects such as the realtime Echo client.
 */

import { createContext, useContext } from "react";
import type { RoleName } from "@/lib/roles";
import type { User, LoginCredentials, RegisterData } from "@/types/auth";

export type LoginResult =
  | { requires_two_factor: false }
  | { requires_two_factor: true; two_factor_token: string };

export type AuthContextType = {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Same as useAuth but returns null outside an AuthProvider instead of
 * throwing. Useful for shared widgets that only need optional user data.
 */
export const useOptionalAuth = () => useContext(AuthContext) ?? null;
