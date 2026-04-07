"use client";

import React, { useCallback, useEffect, useState } from "react";
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
import BacklinkOrdersTable from "./BacklinkOrdersTable";

// ── Helpers ────────────────────────────────────────────────────────────────────

function capacityColor(pct: number): string {
  if (pct >= 90) return "bg-orange-500";
  if (pct >= 70) return "bg-yellow-500";
  if (pct >= 50) return "bg-green-500";
  return "bg-blue-400";
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
      <div className="space-y-4">
        {members.map((member) => (
          <div key={member.user_id}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {member.name}
              </span>
              <span className="tabular-nums text-gray-500 dark:text-gray-400">
                {member.total_assigned} / {member.max_capacity}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ${capacityColor(member.capacity_pct)}`}
                style={{ width: `${Math.min(member.capacity_pct, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
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
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {members.map((member) => (
              <tr key={member.user_id}>
                <td className="py-2.5 pr-4 font-medium text-gray-700 dark:text-gray-300">
                  {member.name}
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`tabular-nums font-semibold ${healthColor(member.health_pct)}`}>
                    {member.health_pct}%
                  </span>
                </td>
                <td className="py-2.5 pr-4 tabular-nums text-gray-500 dark:text-gray-400">
                  {member.links_on_track}/{member.total_links} links on track
                </td>
                <td className="py-2.5 text-right">
                  <span
                    className={`tabular-nums font-medium ${
                      member.links_delayed === 0
                        ? "text-green-500 dark:text-green-400"
                        : "text-orange-500"
                    }`}
                  >
                    {member.links_delayed} links delayed
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminDashboardContent() {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardSummary | null>(null);
  const [capacity, setCapacity] = useState<TeamMemberCapacity[]>([]);
  const [health, setHealth] = useState<TeamMemberHealth[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Staff Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Welcome back,{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {user?.first_name}
            </span>
            . Here is your operations overview.
          </p>
        </div>
        <p className="shrink-0 text-xs text-gray-400 dark:text-gray-500">{today}</p>
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

      {/* Backlink Orders — full-width editable tracking table */}
      <BacklinkOrdersTable />
    </div>
  );
}
