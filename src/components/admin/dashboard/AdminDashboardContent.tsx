"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  GroupIcon,
  DollarLineIcon,
  ListIcon,
  TaskIcon,
} from "@/icons/index";
import { listAdminOrders } from "@/services/admin/order.service";
import { listAdminClients } from "@/services/admin/user.service";
import { listAdminInvoices } from "@/services/admin/invoice.service";
import BacklinkOrdersTable from "./BacklinkOrdersTable";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardStats {
  total_orders: number;
  pending_orders: number;
  total_clients: number;
  total_paid_invoices: number;
}

interface TeamMember {
  name: string;
  capacity_pct: number;
  capacity_color: string;
  links_on_track: number;
  total_links: number;
  links_delayed: number;
}

// ── Team mock data ─────────────────────────────────────────────────────────────
// TODO: Replace with real API data when the team capacity endpoint is available

const TEAM_MEMBERS: TeamMember[] = [
  { name: "Kaitlin", capacity_pct: 95, capacity_color: "bg-orange-500", links_on_track: 20, total_links: 22, links_delayed: 2 },
  { name: "Amanda", capacity_pct: 65, capacity_color: "bg-green-500", links_on_track: 15, total_links: 22, links_delayed: 7 },
  { name: "Lauren", capacity_pct: 100, capacity_color: "bg-yellow-500", links_on_track: 14, total_links: 14, links_delayed: 0 },
  { name: "Krista", capacity_pct: 55, capacity_color: "bg-green-500", links_on_track: 8, total_links: 12, links_delayed: 4 },
];

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

function TeamCapacityWidget() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-5 text-base font-semibold text-gray-900 dark:text-white">
        Team Capacity
      </h2>
      <div className="space-y-4">
        {TEAM_MEMBERS.map((member) => (
          <div key={member.name}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {member.name}
              </span>
              <span className="tabular-nums text-gray-500 dark:text-gray-400">
                {member.capacity_pct}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`h-full rounded-full transition-all duration-700 ${member.capacity_color}`}
                style={{ width: `${member.capacity_pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Team Health widget ─────────────────────────────────────────────────────────

function TeamHealthWidget() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="mb-5 text-base font-semibold text-gray-900 dark:text-white">
        Team Health
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {TEAM_MEMBERS.map((member) => {
              const health_pct =
                member.total_links > 0
                  ? Math.round((member.links_on_track / member.total_links) * 100)
                  : 0;
              const health_color =
                health_pct === 100
                  ? "text-green-600 dark:text-green-400"
                  : health_pct >= 80
                    ? "text-orange-500"
                    : "text-red-500";
              const delayed_color =
                member.links_delayed === 0
                  ? "text-green-500 dark:text-green-400"
                  : "text-orange-500";

              return (
                <tr key={member.name}>
                  <td className="py-2.5 pr-4 font-medium text-gray-700 dark:text-gray-300">
                    {member.name}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`tabular-nums font-semibold ${health_color}`}>
                      {health_pct}%
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums text-gray-500 dark:text-gray-400">
                    {member.links_on_track}/{member.total_links} links on track
                  </td>
                  <td className="py-2.5 text-right">
                    <span className={`tabular-nums font-medium ${delayed_color}`}>
                      {member.links_delayed} links delayed
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdminDashboardContent() {
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [all_orders_res, pending_res, clients_res, invoices_res] = await Promise.all([
        listAdminOrders({ per_page: 1 }),
        listAdminOrders({ per_page: 1, status: "pending" }),
        listAdminClients({}),
        listAdminInvoices({ per_page: 1, status: "paid" }),
      ]);

      setStats({
        total_orders: all_orders_res.total,
        pending_orders: pending_res.total,
        total_clients: clients_res.total,
        total_paid_invoices: invoices_res.total,
      });
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
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-400">
          {error}
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
        <TeamCapacityWidget />
        <TeamHealthWidget />
      </div>

      {/* Backlink Orders — full-width editable tracking table */}
      <BacklinkOrdersTable />
    </div>
  );
}
