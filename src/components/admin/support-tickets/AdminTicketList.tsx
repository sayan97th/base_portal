"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  TicketFilterTab,
  TicketStatus,
  filter_tabs,
  status_bg_map,
  status_label_map,
  priority_color_map,
  priority_dot_map,
  priority_label_map,
  timeAgo,
  formatTicketDate,
  getSenderName,
} from "@/components/support/supportData";
import {
  adminSupportTicketsService,
  AdminApiTicket,
  AdminTicketStats,
  AdminTicketListFilters,
} from "@/services/admin/support-tickets.service";

const STATUS_ORDER: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];

const AdminTicketList: React.FC = () => {
  const router = useRouter();
  const [tickets, setTickets] = useState<AdminApiTicket[]>([]);
  const [stats, setStats] = useState<AdminTicketStats | null>(null);
  const [active_tab, setActiveTab] = useState<TicketFilterTab>("all");
  const [search, setSearch] = useState("");
  const [search_input, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [current_page, setCurrentPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const search_timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTickets = useCallback(async (filters: AdminTicketListFilters) => {
    setLoading(true);
    try {
      const [tickets_res, stats_res] = await Promise.all([
        adminSupportTicketsService.getTickets(filters),
        adminSupportTicketsService.getStats(),
      ]);
      setTickets(tickets_res.data);
      setCurrentPage(tickets_res.current_page);
      setLastPage(tickets_res.last_page);
      setTotal(tickets_res.total);
      setStats(stats_res);
    } catch {
      // silently fail - empty state handles it
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const filters: AdminTicketListFilters = {
      page: current_page,
      per_page: 20,
    };
    if (active_tab !== "all") filters.status = active_tab as TicketStatus;
    if (search) filters.search = search;

    fetchTickets(filters);
  }, [active_tab, search, current_page, fetchTickets]);

  const handleTabChange = (tab: TicketFilterTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (search_timer.current) clearTimeout(search_timer.current);
    search_timer.current = setTimeout(() => {
      setSearch(value);
      setCurrentPage(1);
    }, 350);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Support Tickets</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {total > 0 ? `${total} ticket${total !== 1 ? "s" : ""} total` : "Manage all client support tickets"}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            onClick={() => handleTabChange(status)}
            className={`rounded-xl border p-4 text-left transition-all hover:shadow-sm ${
              active_tab === status
                ? "border-brand-200 bg-brand-50 dark:border-brand-700 dark:bg-brand-500/10"
                : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-white/2 dark:hover:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`h-2 w-2 rounded-full ${
                  status === "open"
                    ? "bg-brand-500"
                    : status === "in_progress"
                    ? "bg-warning-500"
                    : status === "resolved"
                    ? "bg-success-500"
                    : "bg-gray-400"
                }`}
              />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {status_label_map[status]}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats ? (status === "in_progress" ? stats.in_progress : stats[status as keyof AdminTicketStats] ?? 0) : "—"}
            </p>
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-800 w-full sm:w-auto">
          <div className="flex gap-1">
            {filter_tabs.map((tab) => {
              const count =
                tab.value === "all"
                  ? stats?.total ?? 0
                  : tab.value === "in_progress"
                  ? stats?.in_progress ?? 0
                  : (stats?.[tab.value as keyof AdminTicketStats] as number) ?? 0;
              return (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  className={`relative pb-3 px-3 text-sm font-medium transition-colors border-b-2 ${
                    active_tab === tab.value
                      ? "border-brand-500 text-brand-600 dark:text-brand-400 dark:border-brand-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={`ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                        active_tab === tab.value
                          ? "bg-brand-500 text-white"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search tickets, clients…"
            value={search_input}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full sm:w-64 rounded-lg border border-gray-300 bg-white pl-9 pr-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <TicketListSkeleton />
      ) : tickets.length === 0 ? (
        <EmptyState has_search={!!search} />
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <AdminTicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => router.push(`/admin/support-tickets/${ticket.id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {last_page > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Page {current_page} of {last_page}
          </p>
          <div className="flex gap-2">
            <button
              disabled={current_page <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Previous
            </button>
            <button
              disabled={current_page >= last_page}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function AdminTicketCard({
  ticket,
  onClick,
}: {
  ticket: AdminApiTicket;
  onClick: () => void;
}) {
  const client_name = ticket.user ? getSenderName(ticket.user) : "Unknown Client";
  const org_name = ticket.user?.organization?.name;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm dark:border-gray-800 dark:bg-white/2 dark:hover:border-gray-700 transition-all group"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: client avatar + info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20 text-[12px] font-bold text-brand-700 dark:text-brand-300">
            {getInitials(client_name)}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            {/* Top row: ticket # + subject */}
            <div className="flex items-center gap-2 mb-1">
              <span className="shrink-0 text-xs font-mono font-medium text-gray-400 dark:text-gray-500">
                {ticket.ticket_number}
              </span>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                {ticket.subject}
              </h3>
            </div>

            {/* Client name + org */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{client_name}</span>
              {org_name && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">·</span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">{org_name}</span>
                </>
              )}
            </div>

            {/* Meta row */}
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${priority_color_map[ticket.priority]}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${priority_dot_map[ticket.priority]}`} />
                {priority_label_map[ticket.priority]}
              </span>

              {ticket.related_order && (
                <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  {ticket.related_order}
                </span>
              )}

              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {ticket.messages_count ?? 0}
              </span>

              <span className="text-[11px] text-gray-400 dark:text-gray-500" title={formatTicketDate(ticket.created_at)}>
                {timeAgo(ticket.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: status + chevron */}
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

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function EmptyState({ has_search }: { has_search: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        {has_search ? "No tickets match your search" : "No tickets yet"}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
        {has_search
          ? "Try a different search term or clear the filter."
          : "Support tickets from clients will appear here."}
      </p>
    </div>
  );
}

function TicketListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="flex gap-2">
                <div className="h-3 w-14 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-3 w-32 rounded bg-gray-100 dark:bg-gray-800" />
              <div className="flex gap-2">
                <div className="h-4 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
                <div className="h-4 w-12 rounded-full bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
            <div className="h-6 w-20 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default AdminTicketList;
