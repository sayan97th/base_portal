"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { GroupIcon, DollarLineIcon, ListIcon, TaskIcon } from "@/icons/index";
import {
  getDashboardSummary,
  getTeamCapacity,
  getTeamHealth,
} from "@/services/admin/backlink-order.service";
import type {
  DashboardSummary,
  TeamMemberCapacity,
  TeamMemberHealth,
} from "@/types/admin/backlink-order";
import { usePersistentBoolean } from "@/hooks/usePersistentBoolean";
import LinkBuildingOrdersTable from "./LinkBuildingOrdersTable";

// ── Helpers ────────────────────────────────────────────────────────────────────

function capacityTextColor(pct: number): string {
  if (pct >= 90) return "text-orange-500";
  if (pct >= 70) return "text-yellow-500";
  if (pct >= 50) return "text-green-500";
  return "text-blue-400";
}

function healthColor(pct: number): string {
  if (pct === 100) return "text-green-600 dark:text-green-400";
  if (pct >= 80) return "text-orange-500";
  return "text-red-500";
}

// ── Stat card skeleton ─────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="h-11 w-11 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-6 w-14 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

// ── Team widget skeleton ───────────────────────────────────────────────────────

function TeamWidgetSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 h-4 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <div className="h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
            <div className="h-2.5 w-full animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge_color: string;
}

function StatCard({ label, value, description, icon, href, badge_color }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${badge_color} text-white`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

// ── Team Capacity widget ───────────────────────────────────────────────────────

function TeamCapacityWidget({ members }: { members: TeamMemberCapacity[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-5 text-base font-semibold text-gray-900 dark:text-white">
        Team Capacity
      </h2>
      {members.length === 0 ? (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          No active teams configured.
        </p>
      ) : (
        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.team_id}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: member.color }}
                  />
                  {member.name}
                </span>
                <span className="flex items-center gap-1.5 tabular-nums text-gray-500 dark:text-gray-400">
                  {member.total_assigned} / {member.max_capacity}
                  <span className={`font-semibold ${capacityTextColor(member.capacity_pct)}`}>
                    {member.capacity_pct}%
                  </span>
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(member.capacity_pct, 100)}%`,
                    backgroundColor: member.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Team Health widget ─────────────────────────────────────────────────────────

function TeamHealthWidget({ members }: { members: TeamMemberHealth[] }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-5 text-base font-semibold text-gray-900 dark:text-white">
        Team Health
      </h2>
      {members.length === 0 ? (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          No active teams configured.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {members.map((member) => (
                <tr key={member.team_id}>
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: member.color }}
                      />
                      {member.name}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`tabular-nums font-semibold ${healthColor(member.health_pct)}`}>
                      {member.health_pct}%
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-gray-500 dark:text-gray-400">
                    {member.links_on_track}/{member.total_links} on track
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`tabular-nums font-medium ${member.links_delayed === 0
                          ? "text-green-500 dark:text-green-400"
                          : "text-orange-500"
                        }`}
                    >
                      {member.links_delayed} delayed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Collapsed overview strip ───────────────────────────────────────────────────

interface OverviewSummaryStripProps {
  stats: DashboardSummary | null;
  health: TeamMemberHealth[];
  is_loading: boolean;
}

/** One line version of the overview, shown when the stat cards and team panels are hidden. */
function OverviewSummaryStrip({ stats, health, is_loading }: OverviewSummaryStripProps) {
  const links_delayed = health.reduce((total, member) => total + member.links_delayed, 0);
  const summary_items = [
    { label: "Total Orders", value: stats?.total_orders ?? 0, href: "/admin/orders", dot_color: "bg-brand-500" },
    { label: "Pending Orders", value: stats?.pending_orders ?? 0, href: "/admin/orders", dot_color: "bg-warning-500" },
    { label: "Total Clients", value: stats?.total_clients ?? 0, href: "/admin/clients", dot_color: "bg-success-500" },
    { label: "Paid Invoices", value: stats?.total_paid_invoices ?? 0, href: "/admin/invoices", dot_color: "bg-error-500" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs dark:border-gray-800 dark:bg-gray-900">
      {summary_items.map((summary_item) => (
        <Link
          key={summary_item.label}
          href={summary_item.href}
          className="flex items-center gap-1.5 text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
        >
          <span className={`h-2 w-2 rounded-full ${summary_item.dot_color}`} />
          {summary_item.label}
          {is_loading ? (
            <span className="h-3 w-6 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          ) : (
            <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
              {summary_item.value}
            </span>
          )}
        </Link>
      ))}
      {!is_loading && health.length > 0 && (
        <span
          className={`flex items-center gap-1.5 font-medium tabular-nums ${
            links_delayed === 0 ? "text-green-600 dark:text-green-400" : "text-orange-500"
          }`}
        >
          {links_delayed} links delayed
        </span>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const OVERVIEW_VISIBLE_STORAGE_KEY = "admin_dashboard_overview_visible";

export default function AdminDashboardContent() {
  const { user } = useAuth();
  const [is_overview_visible, , toggleOverview] = usePersistentBoolean(OVERVIEW_VISIBLE_STORAGE_KEY, true);

  const [stats, setStats] = useState<DashboardSummary | null>(null);
  const [capacity, setCapacity] = useState<TeamMemberCapacity[]>([]);
  const [health, setHealth] = useState<TeamMemberHealth[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const widget_refresh_timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [summary_res, capacity_res, health_res] = await Promise.all([
        getDashboardSummary(),
        getTeamCapacity(),
        getTeamHealth(),
      ]);
      setStats(summary_res);
      setCapacity(capacity_res.data);
      setHealth(health_res.data);
    } catch {
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const scheduleWidgetRefresh = useCallback(() => {
    if (widget_refresh_timer_ref.current) {
      clearTimeout(widget_refresh_timer_ref.current);
    }
    widget_refresh_timer_ref.current = setTimeout(async () => {
      try {
        const [capacity_res, health_res] = await Promise.all([
          getTeamCapacity(),
          getTeamHealth(),
        ]);
        setCapacity(capacity_res.data);
        setHealth(health_res.data);
      } catch {
        // silently ignore background refresh errors
      }
    }, 1500);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    return () => {
      if (widget_refresh_timer_ref.current) {
        clearTimeout(widget_refresh_timer_ref.current);
      }
    };
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={is_overview_visible ? "space-y-6" : "space-y-4"}>
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Staff Dashboard
          </h1>
          {is_overview_visible && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Welcome back,{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {user?.first_name}
              </span>
              . Here is your operations overview.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">{today}</p>
          <button
            type="button"
            onClick={toggleOverview}
            aria-expanded={is_overview_visible}
            aria-controls="dashboard-overview"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${is_overview_visible ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
            {is_overview_visible ? "Hide overview" : "Show overview"}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
          <span>{error}</span>
          <button
            onClick={fetchDashboardData}
            className="ml-4 rounded-lg border border-error-300 px-3 py-1 text-xs font-medium transition-colors hover:bg-error-100 dark:border-error-500/30 dark:hover:bg-error-500/10"
          >
            Retry
          </button>
        </div>
      )}

      {/* Overview: full cards and team panels, or a one line strip when hidden */}
      {is_overview_visible ? (
        <div id="dashboard-overview" className="space-y-6">
          {/* KPI stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {is_loading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                <StatCard
                  label="Total Orders"
                  value={stats?.total_orders ?? 0}
                  description="All time orders placed"
                  icon={<ListIcon />}
                  href="/admin/orders"
                  badge_color="bg-brand-500"
                />
                <StatCard
                  label="Pending Orders"
                  value={stats?.pending_orders ?? 0}
                  description="Orders awaiting processing"
                  icon={<TaskIcon />}
                  href="/admin/orders"
                  badge_color="bg-warning-500"
                />
                <StatCard
                  label="Total Clients"
                  value={stats?.total_clients ?? 0}
                  description="Registered client accounts"
                  icon={<GroupIcon />}
                  href="/admin/clients"
                  badge_color="bg-success-500"
                />
                <StatCard
                  label="Paid Invoices"
                  value={stats?.total_paid_invoices ?? 0}
                  description="Successfully paid invoices"
                  icon={<DollarLineIcon />}
                  href="/admin/invoices"
                  badge_color="bg-error-500"
                />
              </>
            )}
          </div>

          {/* Team panels */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {is_loading ? (
              <>
                <TeamWidgetSkeleton />
                <TeamWidgetSkeleton />
              </>
            ) : (
              <>
                <TeamCapacityWidget members={capacity} />
                <TeamHealthWidget members={health} />
              </>
            )}
          </div>
        </div>
      ) : (
        <OverviewSummaryStrip stats={stats} health={health} is_loading={is_loading} />
      )}

      {/* Link Building Orders — full-width editable tracking table */}
      <LinkBuildingOrdersTable onOrderMutated={scheduleWidgetRefresh} />

    </div>
  );
}
