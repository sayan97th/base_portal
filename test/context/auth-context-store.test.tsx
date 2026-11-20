import React from "react";
import { renderHook } from "@testing-library/react";
import { AuthContext, useOptionalAuth, type AuthContextType } from "@/context/auth-context-store";

describe("useOptionalAuth", () => {
  it("returns null outside an AuthProvider instead of throwing", () => {
    const { result } = renderHook(() => useOptionalAuth());

    expect(result.current).toBeNull();
  });

  it("returns the current auth value inside a provider", () => {
    const value = { user: { email: "owner@company.com" } } as unknown as AuthContextType;

    const { result } = renderHook(() => useOptionalAuth(), {
      wrapper: ({ children }) => <AuthContext.Provider value={value}>{children}</AuthContext.Provider>,
    });

    expect(result.current?.user?.email).toBe("owner@company.com");
  });
});
