"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminSeoSubscriptionService,
  extractApiError,
} from "@/services/admin/seo-packages-subscription.service";
import type {
  ActivateSeoSubscriptionPayload,
  ActivateSeoSubscriptionResult,
  AdminClientPaymentProfile,
  AdminUserSearchResult,
  SeoSubscriptionPricingType,
} from "@/services/admin/seo-packages-subscription.service";
import { listAdminSeoPackages } from "@/services/admin/seo-packages.service";
import type { AdminSeoPackage } from "@/types/admin/seo-packages";
import { AutoRenewSwitch, PaymentCardPicker } from "./SubscriptionBillingControls";
import {
  formatDate,
  formatMoney,
  formatMoneyCompact,
  monthName,
  ordinal,
  REMINDER_OPTIONS,
  todayIsoDate,
} from "./subscription-format";
import styles from "./SeoSubscriptionBilling.module.scss";

interface Props {
  onSuccess: (result: ActivateSeoSubscriptionResult) => void;
  onCancel: () => void;
}

const INPUT_CLASS =
  "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

function SectionTitle({ step, title, hint }: { step: number; title: string; hint?: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
        {step}
      </span>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </div>
  );
}

function FieldLabel({ children, optional = false }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {children}
      {optional && <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>}
    </label>
  );
}

export default function ActivateSubscriptionModal({ onSuccess, onCancel }: Props) {
  const [packages, setPackages] = useState<AdminSeoPackage[]>([]);
  const [packages_loading, setPackagesLoading] = useState(true);

  const [all_clients, setAllClients] = useState<AdminUserSearchResult[]>([]);
  const [clients_loading, setClientsLoading] = useState(true);
  const [client_filter, setClientFilter] = useState("");
  const [selected_user, setSelectedUser] = useState<AdminUserSearchResult | null>(null);
  const [show_client_dropdown, setShowClientDropdown] = useState(false);
  const client_select_ref = useRef<HTMLDivElement>(null);

  const [cards, setCards] = useState<AdminClientPaymentProfile[]>([]);
  const [cards_loading, setCardsLoading] = useState(false);
  const [selected_card_id, setSelectedCardId] = useState<string | null>(null);

  const [pricing_type, setPricingType] = useState<SeoSubscriptionPricingType>("package");
  const [selected_package_id, setSelectedPackageId] = useState("");
  const [custom_price, setCustomPrice] = useState("");
  const [custom_plan_name, setCustomPlanName] = useState("");
  const [invoice_item_label, setInvoiceItemLabel] = useState("SEO Services");
  const [invoice_item_description, setInvoiceItemDescription] = useState("");

  const today = useMemo(() => todayIsoDate(), []);
  const [starts_at, setStartsAt] = useState(today);
  const [first_billing_date, setFirstBillingDate] = useState(today);
  const [ends_at, setEndsAt] = useState("");
  const [auto_renew, setAutoRenew] = useState(true);
  const [reminder_days, setReminderDays] = useState("3");
  const [charge_now, setChargeNow] = useState(false);
  const [notes, setNotes] = useState("");

  const [is_submitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listAdminSeoPackages()
      .then((data) => setPackages(data.filter((p) => p.is_active)))
      .catch(() => setPackages([]))
      .finally(() => setPackagesLoading(false));

    adminSeoSubscriptionService
      .listAllClients()
      .then((data) => setAllClients(data))
      .catch(() => setAllClients([]))
      .finally(() => setClientsLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (client_select_ref.current && !client_select_ref.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && !is_submitting) onCancel();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [is_submitting, onCancel]);

  const filtered_clients = useMemo(() => {
    const query = client_filter.trim().toLowerCase();
    if (!query) return all_clients;
    return all_clients.filter(
      (c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        (c.organization ?? "").toLowerCase().includes(query)
    );
  }, [all_clients, client_filter]);

  const selected_package = packages.find((p) => p.id === selected_package_id) ?? null;
  const has_usable_card = cards.some((c) => !c.is_expired);
  const parsed_custom_price = Number.parseFloat(custom_price);
  const monthly_price =
    pricing_type === "custom"
      ? Number.isFinite(parsed_custom_price) ? parsed_custom_price : 0
      : selected_package?.price_per_month ?? 0;
  const plan_name =
    pricing_type === "custom"
      ? custom_plan_name.trim() || selected_package?.name || "Custom SEO Package"
      : selected_package?.name ?? "Select a package";
  const billing_day = Number(first_billing_date.split("-")[2] ?? 1);
  const is_first_billing_today = first_billing_date === today;
  const label_preview = `${monthName(first_billing_date)} - ${invoice_item_label.trim() || "SEO Services"}`;

  const price_difference =
    pricing_type === "custom" && selected_package && monthly_price > 0
      ? monthly_price - selected_package.price_per_month
      : null;

  // Cards on file are loaded per client; the latest selection wins.
  const latest_user_id_ref = useRef<number | null>(null);

  const handleSelectUser = useCallback((user: AdminUserSearchResult) => {
    setSelectedUser(user);
    setShowClientDropdown(false);
    setClientFilter("");
    setCards([]);
    setSelectedCardId(null);
    setCardsLoading(true);
    latest_user_id_ref.current = user.id;

    adminSeoSubscriptionService
      .listClientPaymentProfiles(user.id)
      .then((data) => {
        if (latest_user_id_ref.current !== user.id) return;
        setCards(data);
        const default_card = data.find((c) => c.is_default && !c.is_expired) ?? data.find((c) => !c.is_expired);
        setSelectedCardId(default_card?.id ?? null);
      })
      .catch(() => {
        if (latest_user_id_ref.current === user.id) setCards([]);
      })
      .finally(() => {
        if (latest_user_id_ref.current === user.id) setCardsLoading(false);
      });
  }, []);

  function handlePricingType(next: SeoSubscriptionPricingType) {
    setPricingType(next);
    if (next === "custom" && !custom_price && selected_package) {
      setCustomPrice(String(selected_package.price_per_month));
    }
  }

  const is_price_valid = pricing_type === "package" ? !!selected_package : monthly_price >= 0.5;
  const needs_card = auto_renew || charge_now;
  const is_form_valid =
    !!selected_user &&
    is_price_valid &&
    !!starts_at &&
    !!first_billing_date &&
    first_billing_date >= today &&
    (!needs_card || has_usable_card);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected_user || !is_form_valid) return;
    setError(null);
    setIsSubmitting(true);

    const payload: ActivateSeoSubscriptionPayload = {
      user_id: selected_user.id,
      pricing_type,
      package_id: selected_package ? selected_package.id : null,
      custom_price: pricing_type === "custom" ? monthly_price : null,
      custom_plan_name: pricing_type === "custom" ? custom_plan_name.trim() || null : null,
      invoice_item_label: invoice_item_label.trim() || null,
      invoice_item_description: invoice_item_description.trim() || null,
      starts_at,
      first_billing_date,
      ends_at: ends_at || null,
      auto_renew,
      payment_profile_id: selected_card_id,
      reminder_days_before: Number(reminder_days) || null,
      charge_now: charge_now && is_first_billing_today,
      notes: notes.trim() || undefined,
    };

    try {
      const result = await adminSeoSubscriptionService.activateSubscription(payload);
      onSuccess(result);
    } catch (err) {
      setError(extractApiError(err, "Failed to activate subscription. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-99999 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => !is_submitting && onCancel()} />
      <div className="relative flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-3xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 text-white shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Activate SEO Subscription</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Set the price, billing schedule and card for a client
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* ── Form ─────────────────────────────────────────────── */}
            <div className="space-y-7 p-5 sm:p-6">
              {/* 1. Client */}
              <section>
                <SectionTitle step={1} title="Client" />
                <div className="relative" ref={client_select_ref}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowClientDropdown((prev) => !prev);
                      setClientFilter("");
                    }}
                    disabled={clients_loading}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 text-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800"
                  >
                    {clients_loading ? (
                      <span className="text-gray-400">Loading clients…</span>
                    ) : selected_user ? (
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                          {`${selected_user.first_name?.[0] ?? ""}${selected_user.last_name?.[0] ?? ""}`.toUpperCase()}
                        </span>
                        <span className="truncate text-gray-900 dark:text-white">
                          {selected_user.first_name} {selected_user.last_name}
                          <span className="ml-1.5 text-gray-400">{selected_user.email}</span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-400">Select a client…</span>
                    )}
                    <svg
                      className={`ml-2 h-4 w-4 shrink-0 text-gray-400 transition-transform ${show_client_dropdown ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {show_client_dropdown && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                      <div className="border-b border-gray-100 p-2 dark:border-gray-700">
                        <input
                          type="text"
                          value={client_filter}
                          onChange={(e) => setClientFilter(e.target.value)}
                          placeholder="Search by name, email or organization…"
                          autoFocus
                          autoComplete="off"
                          className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {filtered_clients.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No clients found.</p>
                        ) : (
                          filtered_clients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => handleSelectUser(client)}
                              className="flex w-full flex-col px-4 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {client.first_name} {client.last_name}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {client.email}
                                {client.organization ? ` · ${client.organization}` : ""}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* 2. Plan and pricing */}
              <section>
                <SectionTitle step={2} title="Plan and pricing" />
                <div className={styles.segmented} role="radiogroup" aria-label="Pricing type">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={pricing_type === "package"}
                    onClick={() => handlePricingType("package")}
                    className={`${styles.segment} ${pricing_type === "package" ? styles.isActive : ""}`}
                  >
                    <strong>Package price</strong>
                    <small>Use the listed monthly price</small>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={pricing_type === "custom"}
                    onClick={() => handlePricingType("custom")}
                    className={`${styles.segment} ${pricing_type === "custom" ? styles.isActive : ""}`}
                  >
                    <strong>Custom price</strong>
                    <small>Negotiated amount for this client</small>
                  </button>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className={pricing_type === "package" ? "sm:col-span-2" : ""}>
                    <FieldLabel optional={pricing_type === "custom"}>
                      {pricing_type === "custom" ? "Based on package" : "SEO Package"}
                    </FieldLabel>
                    {packages_loading ? (
                      <div className="h-10 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                    ) : (
                      <select
                        value={selected_package_id}
                        onChange={(e) => setSelectedPackageId(e.target.value)}
                        className={INPUT_CLASS}
                      >
                        <option value="">
                          {pricing_type === "custom" ? "No listed package (custom plan)" : "Select a package…"}
                        </option>
                        {packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name}, {formatMoneyCompact(pkg.price_per_month)}/mo
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {pricing_type === "custom" && (
                    <div>
                      <FieldLabel optional>Plan name</FieldLabel>
                      <input
                        type="text"
                        value={custom_plan_name}
                        onChange={(e) => setCustomPlanName(e.target.value)}
                        placeholder={selected_package?.name ?? "Custom SEO Package"}
                        maxLength={120}
                        className={INPUT_CLASS}
                      />
                    </div>
                  )}
                </div>

                {pricing_type === "custom" && (
                  <div className="mt-4">
                    <FieldLabel>Monthly amount</FieldLabel>
                    <div className={styles.moneyInput}>
                      <span>$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.5"
                        step="0.01"
                        value={custom_price}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        placeholder="2000"
                        aria-label="Monthly amount in USD"
                      />
                      <em>USD / month</em>
                    </div>
                    {price_difference !== null && price_difference !== 0 && (
                      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        {formatMoneyCompact(Math.abs(price_difference))} {price_difference < 0 ? "below" : "above"} the listed{" "}
                        {selected_package?.name} price.
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Invoice item name</FieldLabel>
                    <div className="flex h-10 items-center overflow-hidden rounded-xl border border-gray-200 bg-white text-sm focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800">
                      <span className="whitespace-nowrap border-r border-gray-100 bg-gray-50 px-3 py-2.5 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                        Month -
                      </span>
                      <input
                        type="text"
                        value={invoice_item_label}
                        onChange={(e) => setInvoiceItemLabel(e.target.value)}
                        maxLength={120}
                        className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-gray-900 focus:outline-none focus:ring-0 dark:text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel optional>Invoice item description</FieldLabel>
                    <input
                      type="text"
                      value={invoice_item_description}
                      onChange={(e) => setInvoiceItemDescription(e.target.value)}
                      placeholder="Deliverables included this month"
                      maxLength={1000}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              </section>

              {/* 3. Billing */}
              <section>
                <SectionTitle step={3} title="Billing" />
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <FieldLabel>Start date</FieldLabel>
                    <input type="date" value={starts_at} onChange={(e) => setStartsAt(e.target.value)} required className={INPUT_CLASS} />
                  </div>
                  <div>
                    <FieldLabel>First billing date</FieldLabel>
                    <input
                      type="date"
                      value={first_billing_date}
                      min={today}
                      onChange={(e) => setFirstBillingDate(e.target.value)}
                      required
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <FieldLabel optional>End date</FieldLabel>
                    <input
                      type="date"
                      value={ends_at}
                      min={starts_at}
                      onChange={(e) => setEndsAt(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  Billed on the {ordinal(billing_day)} of every month. Leave the end date blank to keep the subscription ongoing.
                </p>

                <div className="mt-4">
                  <AutoRenewSwitch
                    is_on={auto_renew}
                    onToggle={() => setAutoRenew((v) => !v)}
                    description={
                      auto_renew
                        ? "The card on file is charged automatically every month. You can turn this off at any time."
                        : "No automatic charges. You charge each month manually from the subscription page."
                    }
                  />
                </div>

                {selected_user && (
                  <div className="mt-4">
                    <FieldLabel>Card on file</FieldLabel>
                    <PaymentCardPicker
                      cards={cards}
                      selected_id={selected_card_id}
                      is_loading={cards_loading}
                      onSelect={setSelectedCardId}
                    />
                  </div>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Renewal reminder email</FieldLabel>
                    <select
                      value={reminder_days}
                      onChange={(e) => setReminderDays(e.target.value)}
                      disabled={!auto_renew}
                      className={`${INPUT_CLASS} disabled:opacity-60`}
                    >
                      {REMINDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  {is_first_billing_today && has_usable_card && (
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-3.5 py-3 transition-colors hover:border-brand-300 sm:mt-6 dark:border-gray-700">
                      <input
                        type="checkbox"
                        checked={charge_now}
                        onChange={(e) => setChargeNow(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <span className="text-sm">
                        <span className="block font-medium text-gray-900 dark:text-white">Charge the first payment now</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Otherwise it is charged later today by the billing run.
                        </span>
                      </span>
                    </label>
                  )}
                </div>
              </section>

              {/* 4. Notes */}
              <section>
                <SectionTitle step={4} title="Internal notes" hint="Only visible to admins" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="e.g. Custom rate agreed on the strategy call on Nov 20"
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </section>
            </div>

            {/* ── Live billing preview ──────────────────────────────── */}
            <aside className="border-t border-gray-100 bg-gray-50/70 p-5 sm:p-6 lg:border-l lg:border-t-0 dark:border-gray-800 dark:bg-gray-950/40">
              <div className="lg:sticky lg:top-0">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Billing preview</p>
                <div className={styles.preview}>
                  <div className={styles.previewEyebrow}>
                    <span>SEO subscription</span>
                    <span className={`${styles.previewTag} ${pricing_type === "custom" ? styles.isCustom : ""}`}>
                      {pricing_type === "custom" ? "Custom price" : "Package price"}
                    </span>
                  </div>
                  <p className={styles.previewPlan}>{plan_name}</p>
                  <p className={styles.previewAmount}>
                    {formatMoneyCompact(monthly_price)}
                    <span>/ month</span>
                  </p>
                  <p className={styles.previewCompare}>
                    {selected_user
                      ? `For ${selected_user.first_name} ${selected_user.last_name}`.trim()
                      : "Select a client to continue"}
                  </p>

                  <div className={styles.previewDivider} />

                  <dl className={styles.previewRows}>
                    <div className={styles.previewRow}>
                      <dt>First charge</dt>
                      <dd>{formatDate(first_billing_date, { month: "long", day: "numeric", year: "numeric" })}</dd>
                    </div>
                    <div className={styles.previewRow}>
                      <dt>Then</dt>
                      <dd>{auto_renew ? `Every month on the ${ordinal(billing_day)}` : "Charged manually"}</dd>
                    </div>
                    <div className={styles.previewRow}>
                      <dt>Card</dt>
                      <dd>
                        {(() => {
                          const card = cards.find((c) => c.id === selected_card_id);
                          if (card) return `•••• ${card.last_four}`;
                          if (!selected_user) return "Not selected";
                          return has_usable_card ? "Default card" : "No card on file";
                        })()}
                      </dd>
                    </div>
                    <div className={styles.previewRow}>
                      <dt>Reminder</dt>
                      <dd>
                        {auto_renew && Number(reminder_days) > 0
                          ? `${reminder_days} day${reminder_days === "1" ? "" : "s"} before`
                          : "Off"}
                      </dd>
                    </div>
                    {ends_at && (
                      <div className={styles.previewRow}>
                        <dt>Ends</dt>
                        <dd>{formatDate(ends_at)}</dd>
                      </div>
                    )}
                  </dl>

                  <div className={styles.previewInvoiceLine}>
                    Invoice line the client sees
                    <strong>
                      {label_preview} · {formatMoney(monthly_price)}
                    </strong>
                  </div>

                  <p className={styles.previewFootnote}>
                    <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    The client gets an email receipt after every payment, plus a reminder before each renewal when enabled.
                  </p>
                </div>
              </div>
            </aside>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-5 py-4 sm:px-6 dark:border-gray-800">
            {error && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-error-200 bg-error-50 px-4 py-2.5 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}
            {selected_user && needs_card && !cards_loading && !has_usable_card && (
              <p className="mb-3 text-xs text-warning-700 dark:text-warning-400">
                Auto renew needs a card on file. Turn it off to activate now and charge manually later.
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={is_submitting}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!is_form_valid || is_submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {is_submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Activating…
                  </>
                ) : charge_now && is_first_billing_today ? (
                  `Activate and charge ${formatMoneyCompact(monthly_price)}`
                ) : (
                  "Activate Subscription"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
