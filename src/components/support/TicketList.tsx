"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import {
  ApiTicket,
  TicketFilterTab,
  TicketStatus,
  filter_tabs,
  status_bg_map,
  status_label_map,
  priority_dot_map,
  priority_label_map,
  priority_color_map,
  timeAgo,
  formatTicketDate,
} from "./supportData";

interface TicketListProps {
  tickets: ApiTicket[];
  loading?: boolean;
}

const STATUS_ORDER: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];

function getStatusCounts(tickets: ApiTicket[]): Record<TicketFilterTab, number> {
  const counts: Record<TicketFilterTab, number> = {
    all: tickets.length,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  };
  for (const t of tickets) {
    if (t.status in counts) counts[t.status as TicketFilterTab]++;
  }
  return counts;
}

const TicketList: React.FC<TicketListProps> = ({ tickets, loading = false }) => {
  const router = useRouter();
  const [active_tab, setActiveTab] = useState<TicketFilterTab>("all");

  const status_counts = getStatusCounts(tickets);

  const filtered_tickets =
    active_tab === "all"
      ? tickets
      : tickets.filter((t) => t.status === active_tab);

  const sorted_tickets = [...filtered_tickets].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Support Tickets
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track and manage your support requests
          </p>
        </div>
        <Button
          variant="coral"
          size="sm"
          onClick={() => router.push("/support/new")}
          startIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
        >
          New Ticket
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${
              active_tab === status
                ? "border-brand-200 bg-brand-50 dark:border-brand-700 dark:bg-brand-500/10"
                : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-white/2 dark:hover:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`h-2 w-2 rounded-full ${priority_dot_map["medium"]} ${
                status === "open" ? "bg-brand-500" :
                status === "in_progress" ? "bg-warning-500" :
                status === "resolved" ? "bg-success-500" : "bg-gray-400"
              }`} />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {status_label_map[status]}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {status_counts[status]}
            </p>
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-1">
          {filter_tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`relative pb-3 px-3 text-sm font-medium transition-colors border-b-2 ${
                active_tab === tab.value
                  ? "border-brand-500 text-brand-600 dark:text-brand-400 dark:border-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
              {status_counts[tab.value] > 0 && (
                <span className={`ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                  active_tab === tab.value
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}>
                  {status_counts[tab.value]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      {loading ? (
        <TicketListSkeleton />
      ) : sorted_tickets.length === 0 ? (
        <EmptyState onNewTicket={() => router.push("/support/new")} />
      ) : (
        <div className="space-y-3">
          {sorted_tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => router.push(`/support/${ticket.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function TicketCard({
  ticket,
  onClick,
}: {
  ticket: ApiTicket;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-white/2 dark:hover:border-gray-700 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Top row: ticket number + subject */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="shrink-0 text-xs font-mono font-medium text-gray-400 dark:text-gray-500">
              {ticket.ticket_number}
            </span>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
              {ticket.subject}
            </h3>
          </div>

          {/* Bottom row: meta info */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5">
            {/* Priority */}
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${priority_color_map[ticket.priority]}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${priority_dot_map[ticket.priority]}`} />
              {priority_label_map[ticket.priority]}
            </span>

            {/* Related order */}
            {ticket.related_order && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                {ticket.related_order}
              </span>
            )}

            {/* Message count */}
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {ticket.messages_count ?? ticket.messages?.length ?? 0} message{(ticket.messages_count ?? ticket.messages?.length ?? 0) !== 1 ? "s" : ""}
            </span>

            {/* Date */}
            <span className="text-[11px] text-gray-400 dark:text-gray-500" title={formatTicketDate(ticket.created_at)}>
              {timeAgo(ticket.created_at)}
            </span>
          </div>
        </div>

        {/* Status badge + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${status_bg_map[ticket.status]}`}>
            {status_label_map[ticket.status]}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </button>
  );
}

function EmptyState({ onNewTicket }: { onNewTicket: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        No tickets yet
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
        Have a question or issue? Create a support ticket and our team will get back to you.
      </p>
      <Button variant="coral" size="sm" onClick={onNewTicket}>
        Create your first ticket
      </Button>
    </div>
  );
}

function TicketListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="flex gap-2">
                <div className="h-4 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="h-4 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
            <div className="h-6 w-20 rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default TicketList;
