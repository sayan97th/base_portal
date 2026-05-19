"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AdminTicketDetail from "@/components/admin/support-tickets/AdminTicketDetail";
import { adminSupportTicketsService, AdminApiTicket, AdminTicketClientStats } from "@/services/admin/support-tickets.service";

export default function AdminSupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<AdminApiTicket | null>(null);
  const [client_stats, setClientStats] = useState<AdminTicketClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    adminSupportTicketsService
      .getTicket(Number(id))
      .then((res) => {
        setTicket(res.support_ticket);
        setClientStats(res.client_stats);
      })
      .catch(() => setError("Ticket not found or you don't have access."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <TicketDetailSkeleton />;

  if (error || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-error-50 dark:bg-error-500/10">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-error-500">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Ticket not found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">{error ?? "This ticket does not exist."}</p>
      </div>
    );
  }

  return <AdminTicketDetail ticket={ticket} client_stats={client_stats} />;
}

function TicketDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-start gap-3 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
          <div className="h-6 w-72 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-48 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "flex-row-reverse" : "flex-row"}`}>
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
              <div className={`space-y-1 max-w-[60%] ${i % 2 === 0 ? "items-end flex flex-col" : ""}`}>
                <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-16 w-full rounded-2xl bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden lg:block w-72 space-y-4 shrink-0">
          <div className="h-48 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}
