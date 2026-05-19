"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import TicketDetail from "./TicketDetail";
import { ApiTicket } from "./supportData";
import { supportTicketsService } from "@/services/client/support-tickets.service";

interface TicketDetailPageProps {
  ticket_id: number;
}

const TicketDetailPage: React.FC<TicketDetailPageProps> = ({ ticket_id }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<ApiTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTicket = async () => {
      try {
        const data = await supportTicketsService.getTicket(ticket_id);
        if (!cancelled) setTicket(data);
      } catch (err: unknown) {
        if (cancelled) return;
        const api_err = err as { status_code?: number };
        if (api_err?.status_code === 403 || api_err?.status_code === 404) {
          router.replace("/support");
        } else {
          setError("Failed to load ticket. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTicket();
    return () => { cancelled = true; };
  }, [ticket_id, router]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-8">
        <TicketDetailSkeleton />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 dark:bg-error-500/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-error-500">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error ?? "Ticket not found."}</p>
          <button
            onClick={() => router.push("/support")}
            className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            Back to tickets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-8">
      <TicketDetail ticket={ticket} current_user_id={user?.id ?? 0} />
    </div>
  );
};

function TicketDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start gap-3 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-5 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
            <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
          <div className="h-6 w-72 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-48 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
            <div className="space-y-1.5 max-w-sm">
              <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-16 w-64 rounded-2xl bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TicketDetailPage;
