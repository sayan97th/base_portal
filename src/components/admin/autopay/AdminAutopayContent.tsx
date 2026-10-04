"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  disableClientAutopay,
  getAutopayHealth,
  listAutopayEnrollments,
  listChargeAttempts,
} from "@/services/admin/autopay.service";
import type {
  AdminChargeAttempt,
  AutopayEnrollment,
  AutopayHealth,
  ChargeAttemptSource,
  ChargeAttemptStatus,
} from "@/types/admin/autopay";
import { useDebounce } from "@/hooks/useDebounce";

const PER_PAGE = 20;

const STATUS_STYLES: Record<ChargeAttemptStatus, { label: string; class_name: string }> = {
  succeeded:       { label: "Succeeded",       class_name: "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400" },
  failed:          { label: "Failed",          class_name: "bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400" },
  processing:      { label: "Processing",      class_name: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" },
  skipped:         { label: "Skipped",         class_name: "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400" },
  requires_review: { label: "Needs review",    class_name: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400" },
};

const SOURCE_LABELS: Record<ChargeAttemptSource, string> = {
  autopay: "Autopay",
  admin:   "Admin (card on file)",
};

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

const formatDateTime = (iso_date: string | null): string =>
  iso_date ? new Date(iso_date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "—";

function HealthCard({ label, value, tone = "default" }: { label: string; value: React.ReactNode; tone?: "default" | "success" | "error" | "warning" }) {
  const value_class = {
    default: "text-gray-900 dark:text-white",
    success: "text-success-600 dark:text-success-400",
    error:   "text-error-600 dark:text-error-400",
    warning: "text-warning-600 dark:text-warning-400",
  }[tone];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-white/3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${value_class}`}>{value}</p>
    </div>
  );
}

export default function AdminAutopayContent() {
  const [active_tab, setActiveTab] = useState<"activity" | "enrollments">("activity");
  const [health, setHealth] = useState<AutopayHealth | null>(null);

  const [attempts, setAttempts] = useState<AdminChargeAttempt[]>([]);
  const [attempts_loading, setAttemptsLoading] = useState(true);
  const [attempts_error, setAttemptsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [last_page, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status_filter, setStatusFilter] = useState<ChargeAttemptStatus | "">("");
  const [source_filter, setSourceFilter] = useState<ChargeAttemptSource | "">("");
  const [search, setSearch] = useState("");
  const debounced_search = useDebounce(search, 400);

  const [enrollments, setEnrollments] = useState<AutopayEnrollment[]>([]);
  const [enrollments_loading, setEnrollmentsLoading] = useState(false);
  const [enrollments_error, setEnrollmentsError] = useState<string | null>(null);
  const [disabling_user_id, setDisablingUserId] = useState<number | null>(null);

  const loadHealth = useCallback(async () => {
    try {
      setHealth(await getAutopayHealth());
    } catch {
      setHealth(null);
    }
  }, []);

  const loadAttempts = useCallback(async () => {
    setAttemptsLoading(true);
    setAttemptsError(null);
    try {
      const response = await listChargeAttempts({
        page,
        per_page: PER_PAGE,
        status: status_filter,
        source: source_filter,
        search: debounced_search,
      });
      setAttempts(response.data);
      setLastPage(response.last_page);
      setTotal(response.total);
    } catch {
      setAttemptsError("Failed to load charge activity.");
    } finally {
      setAttemptsLoading(false);
    }
  }, [page, status_filter, source_filter, debounced_search]);

  const loadEnrollments = useCallback(async () => {
    setEnrollmentsLoading(true);
    setEnrollmentsError(null);
    try {
      setEnrollments(await listAutopayEnrollments());
    } catch {
      setEnrollmentsError("Failed to load autopay enrollments.");
    } finally {
      setEnrollmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  useEffect(() => {
    if (active_tab === "activity") loadAttempts();
  }, [active_tab, loadAttempts]);

  useEffect(() => {
    if (active_tab === "enrollments") loadEnrollments();
  }, [active_tab, loadEnrollments]);

  const handleDisable = async (enrollment: AutopayEnrollment) => {
    if (!enrollment.user) return;
    const client_name = `${enrollment.user.first_name} ${enrollment.user.last_name}`.trim() || enrollment.user.email;
    if (!window.confirm(`Turn off autopay for ${client_name}? Their future invoices will no longer be charged automatically.`)) {
      return;
    }

    setDisablingUserId(enrollment.user.id);
    try {
      await disableClientAutopay(enrollment.user.id);
      await Promise.all([loadEnrollments(), loadHealth()]);
    } catch {
      setEnrollmentsError("Failed to turn off autopay for this client.");
    } finally {
      setDisablingUserId(null);
    }
  };

  const select_class =
    "h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";
  const th_class = "whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400";
  const td_class = "px-4 py-3 align-top text-sm text-gray-700 dark:text-gray-300";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">Autopay</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Every automatic and card-on-file charge, its result, and the clients enrolled in autopay.
        </p>
      </div>

      {health && !health.scheduler_healthy && (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          <strong>The autopay scheduler has not run recently</strong>
          {health.last_run_at ? ` (last run ${formatDateTime(health.last_run_at)})` : " (it has never run)"}.
          Due invoices are not being charged. Check that the server cron runs <code className="font-mono">php artisan schedule:run</code> every minute.
        </div>
      )}

      {health && health.requires_review > 0 && (
        <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400">
          {health.requires_review} charge{health.requires_review === 1 ? "" : "s"} need manual review in Stripe. Filter by &quot;Needs review&quot; below.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <HealthCard
          label="Scheduler"
          value={health ? (health.scheduler_healthy ? "Running" : "Not running") : "—"}
          tone={health ? (health.scheduler_healthy ? "success" : "error") : "default"}
        />
        <HealthCard label="Last run" value={<span className="text-sm">{formatDateTime(health?.last_run_at ?? null)}</span>} />
        <HealthCard label="Clients enrolled" value={health?.enrolled_clients ?? "—"} />
        <HealthCard label="Collected (30 days)" value={health ? formatCurrency(health.collected_last_30_days) : "—"} tone="success" />
        <HealthCard label="Successful (30 days)" value={health?.succeeded_last_30_days ?? "—"} tone="success" />
        <HealthCard label="Failed (30 days)" value={health?.failed_last_30_days ?? "—"} tone={health && health.failed_last_30_days > 0 ? "error" : "default"} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-4 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
        <div className="mb-5 flex gap-1 border-b border-gray-200 dark:border-gray-800">
          {(["activity", "enrollments"] as const).map((tab_key) => (
            <button
              key={tab_key}
              onClick={() => setActiveTab(tab_key)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                active_tab === tab_key
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab_key === "activity" ? "Charge Activity" : "Enrolled Clients"}
            </button>
          ))}
        </div>

        {active_tab === "activity" && (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Invoice, client, PaymentIntent…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className={`${select_class} sm:w-72`}
              />
              <select
                value={status_filter}
                onChange={(e) => { setStatusFilter(e.target.value as ChargeAttemptStatus | ""); setPage(1); }}
                className={select_class}
              >
                <option value="">All statuses</option>
                {(Object.keys(STATUS_STYLES) as ChargeAttemptStatus[]).map((status_key) => (
                  <option key={status_key} value={status_key}>{STATUS_STYLES[status_key].label}</option>
                ))}
              </select>
              <select
                value={source_filter}
                onChange={(e) => { setSourceFilter(e.target.value as ChargeAttemptSource | ""); setPage(1); }}
                className={select_class}
              >
                <option value="">All sources</option>
                <option value="autopay">Autopay</option>
                <option value="admin">Admin (card on file)</option>
              </select>
            </div>

            {attempts_error ? (
              <p className="py-8 text-center text-sm text-error-600">{attempts_error}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className={th_class}>Date</th>
                      <th className={th_class}>Invoice</th>
                      <th className={th_class}>Client</th>
                      <th className={th_class}>Source</th>
                      <th className={th_class}>Card</th>
                      <th className={`${th_class} text-right`}>Amount</th>
                      <th className={th_class}>Status</th>
                      <th className={th_class}>Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {attempts_loading ? (
                      <tr><td colSpan={8} className="py-10 text-center text-sm text-gray-400">Loading…</td></tr>
                    ) : attempts.length === 0 ? (
                      <tr><td colSpan={8} className="py-10 text-center text-sm text-gray-400">No charges found.</td></tr>
                    ) : (
                      attempts.map((attempt) => {
                        const status_style = STATUS_STYLES[attempt.status];
                        return (
                          <tr key={attempt.id}>
                            <td className={`${td_class} whitespace-nowrap`}>{formatDateTime(attempt.created_at)}</td>
                            <td className={td_class}>
                              {attempt.invoice ? (
                                <Link href={`/admin/invoices/${attempt.invoice.id}`} className="font-mono font-medium text-brand-600 hover:underline dark:text-brand-400">
                                  {attempt.invoice.invoice_number}
                                </Link>
                              ) : "—"}
                            </td>
                            <td className={td_class}>
                              {attempt.user ? (
                                <>
                                  <span className="block font-medium text-gray-900 dark:text-white">{attempt.user.first_name} {attempt.user.last_name}</span>
                                  <span className="block text-xs text-gray-500 dark:text-gray-400">{attempt.user.email}</span>
                                </>
                              ) : "—"}
                            </td>
                            <td className={td_class}>
                              <span className="block">{SOURCE_LABELS[attempt.source]}</span>
                              <span className="block text-xs text-gray-500 dark:text-gray-400">
                                {attempt.source === "admin" ? attempt.initiated_by_name : attempt.attempt_number > 0 ? `Attempt #${attempt.attempt_number}` : ""}
                              </span>
                            </td>
                            <td className={`${td_class} whitespace-nowrap capitalize`}>{attempt.card_label}</td>
                            <td className={`${td_class} whitespace-nowrap text-right font-semibold text-gray-900 dark:text-white`}>{formatCurrency(attempt.amount)}</td>
                            <td className={td_class}>
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status_style.class_name}`}>{status_style.label}</span>
                            </td>
                            <td className={`${td_class} max-w-xs`}>
                              {attempt.failure_message && <span className="block text-xs text-error-600 dark:text-error-400">{attempt.failure_message}</span>}
                              {attempt.next_retry_at && (
                                <span className="block text-xs text-gray-500 dark:text-gray-400">Next retry: {formatDateTime(attempt.next_retry_at)}</span>
                              )}
                              {attempt.stripe_payment_intent_id && (
                                <span className="block font-mono text-[11px] text-gray-400">{attempt.stripe_payment_intent_id}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {last_page > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{total} charge{total === 1 ? "" : "s"}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((current_page) => Math.max(1, current_page - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
                  >
                    Previous
                  </button>
                  <span className="px-2 py-1.5">Page {page} of {last_page}</span>
                  <button
                    onClick={() => setPage((current_page) => Math.min(last_page, current_page + 1))}
                    disabled={page >= last_page}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {active_tab === "enrollments" && (
          enrollments_error ? (
            <p className="py-8 text-center text-sm text-error-600">{enrollments_error}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className={th_class}>Client</th>
                    <th className={th_class}>Status</th>
                    <th className={th_class}>Card</th>
                    <th className={th_class}>Limit / invoice</th>
                    <th className={th_class}>Enabled</th>
                    <th className={th_class}>Notes</th>
                    <th className={th_class} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {enrollments_loading ? (
                    <tr><td colSpan={7} className="py-10 text-center text-sm text-gray-400">Loading…</td></tr>
                  ) : enrollments.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-sm text-gray-400">No client has set up autopay yet.</td></tr>
                  ) : (
                    enrollments.map((enrollment) => (
                      <tr key={enrollment.id}>
                        <td className={td_class}>
                          <span className="block font-medium text-gray-900 dark:text-white">
                            {enrollment.user ? `${enrollment.user.first_name} ${enrollment.user.last_name}` : "—"}
                          </span>
                          <span className="block text-xs text-gray-500 dark:text-gray-400">{enrollment.user?.email}</span>
                        </td>
                        <td className={td_class}>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              enrollment.is_enabled
                                ? "bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {enrollment.is_enabled ? "On" : "Off"}
                          </span>
                        </td>
                        <td className={`${td_class} capitalize`}>{enrollment.card_label ?? "—"}</td>
                        <td className={td_class}>{enrollment.max_amount ? formatCurrency(enrollment.max_amount) : "No limit"}</td>
                        <td className={`${td_class} whitespace-nowrap`}>{formatDateTime(enrollment.enabled_at)}</td>
                        <td className={`${td_class} text-xs text-gray-500 dark:text-gray-400`}>
                          {!enrollment.is_enabled && enrollment.disabled_reason
                            ? `${enrollment.disabled_reason}${enrollment.disabled_by_name ? ` (${enrollment.disabled_by_name})` : ""} — ${formatDateTime(enrollment.disabled_at)}`
                            : enrollment.consent_ip ? `Consent from IP ${enrollment.consent_ip}` : ""}
                        </td>
                        <td className={`${td_class} text-right`}>
                          {enrollment.is_enabled && (
                            <button
                              onClick={() => handleDisable(enrollment)}
                              disabled={disabling_user_id === enrollment.user?.id}
                              className="rounded-lg border border-error-200 px-3 py-1.5 text-xs font-medium text-error-600 transition-colors hover:bg-error-50 disabled:opacity-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                            >
                              {disabling_user_id === enrollment.user?.id ? "Turning off…" : "Turn off"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
