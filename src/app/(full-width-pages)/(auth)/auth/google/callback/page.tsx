"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setToken } from "@/lib/api-client";
import { getPrimaryRole, setPrimaryRoleCookie } from "@/lib/roles";
import { authService } from "@/services/auth.service";
import { Suspense } from "react";

function GoogleCallbackHandler() {
  const search_params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = search_params.get("token");
    const expires_in = search_params.get("expires_in");
    const error = search_params.get("error");

    if (error === "account_disabled") {
      router.replace("/signin?error=account_disabled");
      return;
    }

    if (error || !token) {
      router.replace("/signin?error=google_auth_failed");
      return;
    }

    setToken(token);

    if (expires_in) {
      const expires_at = Date.now() + parseInt(expires_in, 10) * 1000;
      localStorage.setItem("token_expires_at", expires_at.toString());
    }

    authService.getMe().then((data) => {
      const primary_role = getPrimaryRole(data.user.roles);
      setPrimaryRoleCookie(primary_role);
      router.replace("/");
    }).catch(() => {
      router.replace("/");
    });
  }, [search_params, router]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center w-full">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Completing sign in with Google...</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense>
      <GoogleCallbackHandler />
    </Suspense>
  );
}
