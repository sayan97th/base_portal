"use client";

import React, { useEffect, useState } from "react";
import { impersonationService } from "@/services/admin/impersonation.service";
import { useAuth } from "@/context/AuthContext";
import type { ImpersonationMeta } from "@/types/auth";

function computeElapsed(started_at: string): string {
  const diff = Math.floor((Date.now() - new Date(started_at).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;
  if (minutes < 60) return `${minutes}m ${seconds}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function useElapsedTime(started_at: string): string {
  const [elapsed, setElapsed] = useState(() => computeElapsed(started_at));

  useEffect(() => {
    const id = setInterval(() => setElapsed(computeElapsed(started_at)), 1000);
    return () => clearInterval(id);
  }, [started_at]);

  return elapsed;
}

export default function ImpersonationBanner() {
  const { user, isLoading } = useAuth();
  const [meta, setMeta] = useState<ImpersonationMeta | null>(null);
  const [is_stopping, setIsStopping] = useState(false);

  useEffect(() => {
    // Wait until auth has resolved before deciding whether the session is real.
    if (isLoading) return;

    if (!impersonationService.isImpersonating()) {
      setMeta(null);
      return;
    }

    const stored = impersonationService.getImpersonationMeta();

    // The banner is only valid while the authenticated user IS the impersonated
    // target. If the impersonation token expired (or was invalidated) and the
    // admin logged back in with their own credentials, the stored data is stale.
    // Clear it so the banner disappears instead of showing a phantom session.
    if (!stored || !user || user.id !== stored.target_id) {
      impersonationService.clearImpersonation();
      setMeta(null);
      return;
    }

    setMeta(stored);
  }, [isLoading, user]);
  const elapsed = useElapsedTime(meta?.started_at ?? new Date().toISOString());

  if (!meta) return null;

  async function handleStop() {
    if (is_stopping) return;
    setIsStopping(true);
    const return_path = meta?.target_is_staff ? "/admin/users" : "/admin/clients";
    try {
      await impersonationService.stopImpersonation();
    } catch {
      impersonationService.clearImpersonation();
    } finally {
      window.location.href = return_path;
    }
  }

  return (
    <div className="relative z-40 w-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-md dark:from-amber-600 dark:to-orange-600">
      <div className="mx-auto flex max-w-(--breakpoint-2xl) items-center justify-between gap-4 px-4 py-2.5 md:px-6">

        {/* Left — identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                Impersonation Active
              </span>
              <span className="hidden h-3.5 w-px bg-white/30 sm:block" />
              <span className="text-xs font-medium text-white">
                Viewing as{" "}
                <strong className="font-semibold">
                  {meta.target_first_name} {meta.target_last_name}
                </strong>
              </span>
              <span className="hidden h-3.5 w-px bg-white/30 sm:block" />
              <span className="hidden text-xs text-white/70 sm:inline">
                {meta.target_email}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-white/60">
              Admin:{" "}
              <span className="font-medium text-white/80">
                {meta.admin_first_name} {meta.admin_last_name}
              </span>
              {" · "}Session active for{" "}
              <span className="font-mono font-medium text-white/90">{elapsed}</span>
            </p>
          </div>
        </div>

        {/* Right — stop button */}
        <button
          onClick={handleStop}
          disabled={is_stopping}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-white/25 disabled:opacity-60"
        >
          {is_stopping ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Stopping…
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 12.728M5.636 5.636a9 9 0 1 1 12.728 12.728M5.636 5.636 12 12m0 0 6.364 6.364" />
              </svg>
              Stop Impersonation
            </>
          )}
        </button>
      </div>

      {/* Subtle animated stripe */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </div>
  );
}
