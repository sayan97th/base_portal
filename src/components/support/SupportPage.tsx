"use client";

import React, { useEffect, useState } from "react";
import TicketList from "./TicketList";
import { ApiTicket } from "./supportData";
import { supportTicketsService } from "@/services/client/support-tickets.service";

const SupportPage: React.FC = () => {
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTickets = async () => {
      try {
        const response = await supportTicketsService.getTickets({ per_page: 50 });
        if (!cancelled) setTickets(response.data);
      } catch {
        if (!cancelled) setError("Failed to load tickets. Please refresh the page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTickets();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 dark:bg-error-500/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-error-500">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-8">
      <TicketList tickets={tickets} loading={loading} />
    </div>
  );
};

export default SupportPage;
