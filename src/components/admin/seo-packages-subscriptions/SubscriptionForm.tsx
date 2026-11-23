"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminSeoSubscriptionService,
  extractApiError,
} from "@/services/admin/seo-packages-subscription.service";
import type {
  ActivateSeoSubscriptionPayload,
  AdminClientPaymentProfile,
  AdminSeoSubscription,
  AdminUserSearchResult,
  SeoSubscriptionPricingType,
  UpdateSeoSubscriptionPayload,
} from "@/services/admin/seo-packages-subscription.service";
import { listAdminSeoPackages } from "@/services/admin/seo-packages.service";
import type { AdminSeoPackage } from "@/types/admin/seo-packages";
import DateField from "@/components/form/date-field/DateField";
import {
  AutoRenewSwitch,
  DEFAULT_REMINDER_DAYS,
  PaymentCardPicker,
  ReminderControl,
  pluralDays,
} from "./SubscriptionBillingControls";
import {
  buildChargeSchedule,
  clientName,
  dayOfMonth,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  initials,
  monthName,
  ordinal,
  todayIsoDate,
} from "./subscription-format";
import styles from "./SeoSubscriptionBilling.module.scss";

interface Props {
  mode: "create" | "edit";
  /** Required in edit mode. */
  subscription?: AdminSeoSubscription;
}

const INPUT_CLASS =
  "h-[42px] w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

// ── Small building blocks ──────────────────────────────────────────────────────

function FormSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.formSection}>
      <div className={styles.formSectionHeader}>
        <span className={styles.formSectionIcon}>{icon}</span>
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <div className={styles.formSectionBody}>{children}</div>
    </section>
  );
}

function FieldLabel({ html_for, children, optional = false }: { html_for?: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={html_for} className={styles.fieldLabel}>
      {children}
      {optional && <small>(optional)</small>}
    </label>
  );
}

const ICONS = {
  client: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0115 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.5-1.632z" />
    </svg>
  ),
  pricing: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  ),
  schedule: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  payment: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
    </svg>
  ),
  notes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    </svg>
  ),
};

// ── Main form ──────────────────────────────────────────────────────────────────

export default function SubscriptionForm({ mode, subscription }: Props) {
  const router = useRouter();
  const is_edit = mode === "edit" && !!subscription;
  const today = useMemo(() => todayIsoDate(), []);

  // Reference data
  const [packages, setPackages] = useState<AdminSeoPackage[]>([]);
  const [packages_loading, setPackagesLoading] = useState(true);
  const [all_clients, setAllClients] = useState<AdminUserSearchResult[]>([]);
  const [clients_loading, setClientsLoading] = useState(!is_edit);
  const [cards, setCards] = useState<AdminClientPaymentProfile[]>([]);
  const [cards_loading, setCardsLoading] = useState(is_edit);

  // Client (create only)
  const [selected_user, setSelectedUser] = useState<AdminUserSearchResult | null>(null);
  const [client_filter, setClientFilter] = useState("");
  const [show_client_dropdown, setShowClientDropdown] = useState(false);
  const client_select_ref = useRef<HTMLDivElement>(null);
  const latest_user_id_ref = useRef<number | null>(null);

  // Plan and pricing
  const [pricing_type, setPricingType] = useState<SeoSubscriptionPricingType>(subscription?.pricing_type ?? "package");
  const [selected_package_id, setSelectedPackageId] = useState(subscription?.package?.id ?? "");
  const [custom_price, setCustomPrice] = useState(subscription ? String(subscription.monthly_price) : "");
  const [custom_plan_name, setCustomPlanName] = useState(subscription?.pricing_type === "custom" ? subscription.plan_name : "");
  const [invoice_item_label, setInvoiceItemLabel] = useState(subscription?.invoice_item_label ?? "SEO Services");
  const [invoice_item_description, setInvoiceItemDescription] = useState(subscription?.invoice_item_description ?? "");

  // Schedule: like any subscription app, the first payment sets the billing
  // day and it renews monthly until cancelled. The rest is advanced.
  const [first_payment_date, setFirstPaymentDate] = useState(today);
  const [service_start_date, setServiceStartDate] = useState("");
  const [next_billing_date, setNextBillingDate] = useState(subscription?.next_billing_date ?? today);
  const [end_date, setEndDate] = useState(subscription?.ends_at ? subscription.ends_at.slice(0, 10) : "");
  const [show_advanced, setShowAdvanced] = useState(!!subscription?.ends_at);

  // Payment and renewals
  const [auto_renew, setAutoRenew] = useState(subscription?.auto_renew ?? true);
  const [selected_card_id, setSelectedCardId] = useState<string | null>(subscription?.payment_profile_id ?? null);
  const [reminder_days, setReminderDays] = useState<number | null>(
    subscription ? (subscription.reminder_days_before || null) : DEFAULT_REMINDER_DAYS
  );
  const [charge_now, setChargeNow] = useState(false);
  const [notes, setNotes] = useState(subscription?.notes ?? "");

  const [is_submitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Data loading ───────────────────────────────────────────────────────────

  const loadCards = useCallback((user_id: number, keep_selection: boolean) => {
    latest_user_id_ref.current = user_id;
    setCardsLoading(true);
    adminSeoSubscriptionService
      .listClientPaymentProfiles(user_id)
      .then((data) => {
        if (latest_user_id_ref.current !== user_id) return;
        setCards(data);
        if (!keep_selection) {
          const default_card = data.find((c) => c.is_default && !c.is_expired) ?? data.find((c) => !c.is_expired);
          setSelectedCardId(default_card?.id ?? null);
        }
      })
      .catch(() => latest_user_id_ref.current === user_id && setCards([]))
      .finally(() => latest_user_id_ref.current === user_id && setCardsLoading(false));
  }, []);

  useEffect(() => {
    let is_current = true;
    listAdminSeoPackages()
      .then((data) => is_current && setPackages(data.filter((p) => p.is_active)))
      .catch(() => is_current && setPackages([]))
      .finally(() => is_current && setPackagesLoading(false));

    if (!is_edit) {
      adminSeoSubscriptionService
        .listAllClients()
        .then((data) => is_current && setAllClients(data))
        .catch(() => is_current && setAllClients([]))
        .finally(() => is_current && setClientsLoading(false));
    }
    return () => {
      is_current = false;
    };
  }, [is_edit]);

  // Edit mode: the client is fixed, load their cards once.
  const edit_user_id = subscription?.user.id;
  useEffect(() => {
    if (!is_edit || !edit_user_id) return;
    let is_current = true;
    adminSeoSubscriptionService
      .listClientPaymentProfiles(edit_user_id)
      .then((data) => is_current && setCards(data))
      .catch(() => is_current && setCards([]))
      .finally(() => is_current && setCardsLoading(false));
    return () => {
      is_current = false;
    };
  }, [is_edit, edit_user_id]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (client_select_ref.current && !client_select_ref.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────

  const filtered_clients = useMemo(() => {
    const query = client_filter.trim().toLowerCase();
    if (!query) return all_clients;
    return all_clients.filter(
      (c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        (c.company ?? "").toLowerCase().includes(query)
    );
  }, [all_clients, client_filter]);

  const selected_package = packages.find((p) => p.id === selected_package_id) ?? null;
  const parsed_custom_price = Number.parseFloat(custom_price);
  const monthly_price =
    pricing_type === "custom"
      ? Number.isFinite(parsed_custom_price) ? parsed_custom_price : 0
      : selected_package?.price_per_month ?? (is_edit && subscription?.pricing_type === "package" ? subscription.monthly_price : 0);
  const plan_name =
    pricing_type === "custom"
      ? custom_plan_name.trim() || selected_package?.name || "Custom SEO Package"
      : selected_package?.name ?? (is_edit ? subscription?.plan_name ?? "" : "Select a package");

  const first_billing_date = is_edit ? next_billing_date : first_payment_date;
  const starts_at = service_start_date || first_payment_date;
  const ends_at = end_date || null;

  const billing_day = dayOfMonth(first_billing_date);
  const schedule = buildChargeSchedule(first_billing_date, 4, ends_at);
  // How many payments fit before the end date (capped, only shown as a count).
  const payments_until_end = ends_at ? buildChargeSchedule(first_billing_date, 240, ends_at).length : null;
  const advanced_count = (is_edit ? 0 : service_start_date ? 1 : 0) + (end_date ? 1 : 0);
  const is_first_billing_today = first_billing_date === today;
  const has_usable_card = cards.some((c) => !c.is_expired);
  const label_preview = `${monthName(first_billing_date)} - ${invoice_item_label.trim() || "SEO Services"}`;
  const price_difference =
    pricing_type === "custom" && selected_package && monthly_price > 0 ? monthly_price - selected_package.price_per_month : null;
  const client_for_display = is_edit ? subscription?.user ?? null : selected_user;
  const needs_card = auto_renew || (charge_now && is_first_billing_today);

  const validation_message = (() => {
    if (!is_edit && !selected_user) return "Select a client.";
    if (pricing_type === "package" && !selected_package) return "Select an SEO package.";
    if (pricing_type === "custom" && monthly_price < 0.5) return "Enter a monthly amount of at least $0.50.";
    if (!first_billing_date) return "Choose when the first payment happens.";
    if (first_billing_date < today) return "The first payment date cannot be in the past.";
    if (ends_at && ends_at < first_billing_date) return "The end date must be after the first payment.";
    if (ends_at && !is_edit && ends_at <= starts_at) return "The end date must be after the service start date.";
    if (needs_card && !cards_loading && client_for_display && !has_usable_card)
      return "Auto renew needs a card on file. Turn it off to bill manually.";
    return null;
  })();

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSelectUser(user: AdminUserSearchResult) {
    setSelectedUser(user);
    setShowClientDropdown(false);
    setClientFilter("");
    setCards([]);
    setSelectedCardId(null);
    loadCards(user.id, false);
  }

  function handlePricingType(next: SeoSubscriptionPricingType) {
    setPricingType(next);
    if (next === "custom" && !custom_price && selected_package) {
      setCustomPrice(String(selected_package.price_per_month));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validation_message) {
      setError(validation_message);
      return;
    }
    setError(null);
    setIsSubmitting(true);

    const pricing_fields = {
      pricing_type,
      package_id: selected_package ? selected_package.id : null,
      custom_price: pricing_type === "custom" ? monthly_price : null,
      custom_plan_name: pricing_type === "custom" ? custom_plan_name.trim() || null : null,
      invoice_item_label: invoice_item_label.trim() || null,
      invoice_item_description: invoice_item_description.trim() || null,
    };

    try {
      if (is_edit && subscription) {
        const payload: UpdateSeoSubscriptionPayload = {
          ...pricing_fields,
          auto_renew,
          payment_profile_id: selected_card_id,
          reminder_days_before: auto_renew ? reminder_days : null,
          ends_at,
          notes: notes.trim() || null,
        };
        if (next_billing_date !== subscription.next_billing_date) {
          payload.next_billing_date = next_billing_date;
        }
        await adminSeoSubscriptionService.updateSubscription(subscription.id, payload);
        router.push(`/admin/seo-packages-subscriptions/${subscription.id}?notice=updated`);
        return;
      }

      if (!selected_user) return;
      const payload: ActivateSeoSubscriptionPayload = {
        user_id: selected_user.id,
        ...pricing_fields,
        starts_at,
        first_billing_date,
        ends_at,
        auto_renew,
        payment_profile_id: selected_card_id,
        reminder_days_before: auto_renew ? reminder_days : null,
        charge_now: charge_now && is_first_billing_today,
        notes: notes.trim() || undefined,
      };
      const result = await adminSeoSubscriptionService.activateSubscription(payload);
      const notice = !result.charge_result ? "activated" : result.charge_result.success ? "activated_charged" : "activated_charge_failed";
      router.push(`/admin/seo-packages-subscriptions/${result.data.id}?notice=${notice}`);
    } catch (err) {
      setError(extractApiError(err, is_edit ? "Failed to save the changes. Please try again." : "Failed to activate the subscription. Please try again."));
      setIsSubmitting(false);
    }
  }

  const back_href = is_edit && subscription ? `/admin/seo-packages-subscriptions/${subscription.id}` : "/admin/seo-packages-subscriptions";
  const selected_card = cards.find((c) => c.id === selected_card_id);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Page header */}
      <div>
        <Link href={back_href} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-brand-500 dark:text-gray-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {is_edit ? "Back to subscription" : "All subscriptions"}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">
          {is_edit ? "Edit SEO Subscription" : "Activate SEO Subscription"}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {is_edit
            ? "Update the price, billing schedule and payment settings. Invoices already issued keep their amount."
            : "Set the price, billing schedule and card for a client. You can change everything later."}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Left column ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Client */}
          <FormSection icon={ICONS.client} title="Client" description={is_edit ? "The client this subscription belongs to." : "Who is this subscription for?"}>
            {client_for_display && (is_edit || !show_client_dropdown) ? (
              <div className={styles.clientCard}>
                <span className={styles.clientAvatar}>
                  {initials(`${client_for_display.first_name ?? ""} ${client_for_display.last_name ?? ""}`.trim() || client_for_display.email)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {is_edit && subscription ? clientName(subscription) : `${client_for_display.first_name} ${client_for_display.last_name}`}
                  </p>
                  {client_for_display.company && (
                    <p className="truncate text-xs font-medium text-gray-600 dark:text-gray-300">{client_for_display.company}</p>
                  )}
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{client_for_display.email}</p>
                </div>
                {!is_edit && (
                  <button
                    type="button"
                    onClick={() => setShowClientDropdown(true)}
                    className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <div className="relative" ref={client_select_ref}>
                <div className="relative">
                  <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={client_filter}
                    onChange={(e) => {
                      setClientFilter(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder={clients_loading ? "Loading clients…" : "Search by name, email or company…"}
                    disabled={clients_loading}
                    autoComplete="off"
                    className={`${INPUT_CLASS} pl-10`}
                  />
                </div>
                {show_client_dropdown && !clients_loading && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
                    {filtered_clients.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No clients found.</p>
                    ) : (
                      filtered_clients.slice(0, 100).map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => handleSelectUser(client)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-brand-50/60 dark:hover:bg-gray-700"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {initials(`${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || client.email)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                              {client.first_name} {client.last_name}
                              {client.company && <span className="ml-1.5 font-normal text-gray-500">· {client.company}</span>}
                            </span>
                            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{client.email}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </FormSection>

          {/* Plan and pricing */}
          <FormSection icon={ICONS.pricing} title="Plan and pricing" description="Use the listed package price, or a price negotiated with this client.">
            <div className={styles.segmented} role="radiogroup" aria-label="Pricing type">
              {(["package", "custom"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={pricing_type === type}
                  onClick={() => handlePricingType(type)}
                  className={`${styles.segment} ${pricing_type === type ? styles.isActive : ""}`}
                >
                  <strong>{type === "package" ? "Package price" : "Custom price"}</strong>
                  <small>{type === "package" ? "Use the listed monthly price" : "Negotiated amount for this client"}</small>
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className={pricing_type === "package" ? "sm:col-span-2" : ""}>
                <FieldLabel html_for="subscription-package" optional={pricing_type === "custom"}>
                  {pricing_type === "custom" ? "Based on package" : "SEO package"}
                </FieldLabel>
                {packages_loading ? (
                  <div className="h-[42px] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
                ) : (
                  <select id="subscription-package" value={selected_package_id} onChange={(e) => setSelectedPackageId(e.target.value)} className={INPUT_CLASS}>
                    <option value="">{pricing_type === "custom" ? "No listed package (custom plan)" : "Select a package…"}</option>
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
                  <FieldLabel html_for="subscription-plan-name" optional>Plan name</FieldLabel>
                  <input
                    id="subscription-plan-name"
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
                <FieldLabel html_for="subscription-custom-price">Monthly amount</FieldLabel>
                <div className={styles.moneyInput}>
                  <span>$</span>
                  <input
                    id="subscription-custom-price"
                    type="number"
                    inputMode="decimal"
                    min="0.5"
                    step="0.01"
                    value={custom_price}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="2000"
                  />
                  <em>USD / month</em>
                </div>
                {price_difference !== null && price_difference !== 0 && (
                  <p className={styles.fieldHint}>
                    {formatMoneyCompact(Math.abs(price_difference))} {price_difference < 0 ? "below" : "above"} the listed {selected_package?.name} price.
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel html_for="subscription-item-label">Invoice item name</FieldLabel>
                <div className="flex h-[42px] items-center overflow-hidden rounded-xl border border-gray-200 bg-white text-sm focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800">
                  <span className="whitespace-nowrap border-r border-gray-100 bg-gray-50 px-3 py-2.5 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">Month -</span>
                  <input
                    id="subscription-item-label"
                    type="text"
                    value={invoice_item_label}
                    onChange={(e) => setInvoiceItemLabel(e.target.value)}
                    maxLength={120}
                    className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-gray-900 focus:outline-none focus:ring-0 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <FieldLabel html_for="subscription-item-description" optional>Invoice item description</FieldLabel>
                <input
                  id="subscription-item-description"
                  type="text"
                  value={invoice_item_description}
                  onChange={(e) => setInvoiceItemDescription(e.target.value)}
                  placeholder="Deliverables included each month"
                  maxLength={1000}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </FormSection>

          {/* Billing schedule */}
          <FormSection
            icon={ICONS.schedule}
            title="Billing schedule"
            description="Renews every month on the same day until cancelled, like any subscription."
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)] sm:items-end">
              <div>
                <FieldLabel html_for="subscription-first-payment">{is_edit ? "Next payment" : "First payment"}</FieldLabel>
                <DateField
                  id="subscription-first-payment"
                  value={first_billing_date}
                  onChange={(value) =>
                    is_edit
                      ? setNextBillingDate(value || subscription?.next_billing_date || today)
                      : setFirstPaymentDate(value || today)
                  }
                  min={today}
                  marked_dates={schedule}
                  footer_hint="Sets the billing day"
                />
              </div>
              <div className={styles.scheduleSummary} aria-live="polite">
                <span className={styles.scheduleSummaryIcon} aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </span>
                <span>
                  {auto_renew ? "Charged " : "First payment due "}
                  <strong>{first_billing_date === today ? "today" : `on ${formatDate(first_billing_date, { month: "short", day: "numeric" })}`}</strong>
                  , then <strong>on the {ordinal(billing_day)} of every month</strong>{" "}
                  {ends_at ? (
                    <>
                      until <strong>{formatDate(ends_at, { month: "short", day: "numeric", year: "numeric" })}</strong>.
                    </>
                  ) : (
                    "until cancelled."
                  )}
                  {!auto_renew && " Each payment is charged manually."}
                </span>
              </div>
            </div>
            {!is_edit && (
              <p className={styles.fieldHint}>
                Client already paid this month? Pick next month&apos;s date as the first payment.
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              aria-expanded={show_advanced}
              className={`${styles.advancedToggle} ${show_advanced ? styles.isOpen : ""}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              Advanced options
              {advanced_count > 0 && <span className={styles.advancedCount}>{advanced_count}</span>}
            </button>

            {show_advanced && (
              <div className={styles.advancedPanel}>
                {is_edit && subscription ? (
                  <div>
                    <p className={styles.fieldLabel}>Service started</p>
                    <p className="flex h-[42px] items-center rounded-xl bg-gray-50 px-3 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {formatDate(subscription.starts_at, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                ) : (
                  <div>
                    <FieldLabel html_for="subscription-service-start" optional>Service start date</FieldLabel>
                    <DateField
                      id="subscription-service-start"
                      value={service_start_date}
                      onChange={setServiceStartDate}
                      clearable
                      placeholder="Same as first payment"
                      footer_hint="For your records only"
                    />
                    <p className={styles.fieldHint}>Only if the SEO work started on a different day.</p>
                  </div>
                )}
                <div>
                  <FieldLabel html_for="subscription-end-date" optional>End date</FieldLabel>
                  <DateField
                    id="subscription-end-date"
                    value={end_date}
                    onChange={setEndDate}
                    min={first_billing_date}
                    clearable
                    placeholder="Never, until cancelled"
                    marked_dates={schedule}
                    footer_hint="Dots mark the payment days"
                  />
                  <p className={styles.fieldHint}>
                    {payments_until_end
                      ? `${payments_until_end} payment${payments_until_end === 1 ? "" : "s"}, then it stops by itself.`
                      : "Leave empty for a regular ongoing subscription."}
                  </p>
                </div>
              </div>
            )}
          </FormSection>

          {/* Payment and renewals */}
          <FormSection icon={ICONS.payment} title="Payment and renewals" description="How the client is charged each month and what they are told.">
            <AutoRenewSwitch
              is_on={auto_renew}
              onToggle={() => setAutoRenew((v) => !v)}
              description={
                auto_renew
                  ? `The card on file is charged automatically on the ${ordinal(billing_day)} of every month. You can turn this off at any time.`
                  : "No automatic charges. You charge each month manually from the subscription page."
              }
            />

            {client_for_display ? (
              <div className="mt-5">
                <p className={styles.fieldLabel}>Card on file</p>
                <PaymentCardPicker cards={cards} selected_id={selected_card_id} is_loading={cards_loading} onSelect={setSelectedCardId} />
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                Select a client to see their cards on file.
              </p>
            )}

            <div className="mt-5">
              <ReminderControl
                value={reminder_days}
                is_auto_renew={auto_renew}
                next_charge_date={first_billing_date}
                last_reminder_sent_for={is_edit ? subscription?.last_reminder_sent_for : null}
                onChange={setReminderDays}
              />
            </div>

            {!is_edit && is_first_billing_today && has_usable_card && (
              <div className="mt-4">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-3.5 py-3 transition-colors hover:border-brand-300 dark:border-gray-700">
                  <input
                    type="checkbox"
                    checked={charge_now}
                    onChange={(e) => setChargeNow(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <span className="text-sm">
                    <span className="block font-medium text-gray-900 dark:text-white">Charge the first payment now</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Otherwise it is charged later today by the billing run.</span>
                  </span>
                </label>
              </div>
            )}
          </FormSection>

          {/* Notes */}
          <FormSection icon={ICONS.notes} title="Internal notes" description="Only visible to admins.">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="e.g. Custom rate agreed on the strategy call on Nov 20"
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </FormSection>
        </div>

        {/* ── Right column: live preview and actions ───────────────── */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className={styles.preview}>
            <div className={styles.previewEyebrow}>
              <span>SEO subscription</span>
              <span className={`${styles.previewTag} ${pricing_type === "custom" ? styles.isCustom : ""}`}>
                {pricing_type === "custom" ? "Custom price" : "Package price"}
              </span>
            </div>
            <p className={styles.previewPlan}>{plan_name || "Select a package"}</p>
            <p className={styles.previewAmount}>
              {formatMoneyCompact(monthly_price)}
              <span>/ month</span>
            </p>
            <p className={styles.previewCompare}>
              {client_for_display
                ? `For ${client_for_display.company || `${client_for_display.first_name ?? ""} ${client_for_display.last_name ?? ""}`.trim()}`
                : "Select a client to continue"}
            </p>

            <div className={styles.previewDivider} />

            {/* What happens, following the billing schedule choices */}
            <ol className={styles.previewSteps} aria-label="Billing timeline">
              <li>
                <span className={styles.previewStepLabel}>{is_edit ? "Next charge" : "First charge"}</span>
                <span className={styles.previewStepText}>
                  {first_billing_date === today ? "Today" : formatDate(first_billing_date, { weekday: "short", month: "short", day: "numeric" })}
                  {" · "}
                  {formatMoneyCompact(monthly_price)}
                </span>
              </li>
              {payments_until_end !== 1 && (
                <li>
                  <span className={styles.previewStepLabel}>Then</span>
                  <span className={styles.previewStepText}>
                    Every month on the {ordinal(billing_day)}
                    <br />
                    <small>{auto_renew ? "Charged automatically to the card on file" : "You charge each month manually"}</small>
                  </span>
                </li>
              )}
              <li className={styles.isEnd}>
                <span className={styles.previewStepLabel}>Ends</span>
                <span className={styles.previewStepText}>
                  {ends_at ? formatDate(ends_at, { month: "short", day: "numeric", year: "numeric" }) : "When you cancel it"}
                  {payments_until_end ? (
                    <>
                      <br />
                      <small>
                        After {payments_until_end} payment{payments_until_end === 1 ? "" : "s"}
                      </small>
                    </>
                  ) : null}
                </span>
              </li>
            </ol>

            <div className={styles.previewDivider} />

            <dl className={styles.previewRows}>
              <div className={styles.previewRow}>
                <dt>Card</dt>
                <dd>
                  {selected_card
                    ? `•••• ${selected_card.last_four}`
                    : !client_for_display
                      ? "Not selected"
                      : has_usable_card
                        ? "Default card"
                        : "No card on file"}
                </dd>
              </div>
              <div className={styles.previewRow}>
                <dt>Reminder email</dt>
                <dd>
                  {auto_renew && reminder_days ? `${pluralDays(reminder_days)} before` : "Off"}
                </dd>
              </div>
            </dl>

            <div className={styles.previewInvoiceLine}>
              Invoice line the client sees
              <strong>
                {label_preview} · {formatMoney(monthly_price)}
              </strong>
            </div>
          </div>

          {(error || validation_message) && (
            <div
              role={error ? "alert" : undefined}
              className={`rounded-xl border px-4 py-3 text-sm ${
                error
                  ? "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400"
                  : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {error ?? validation_message}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={is_submitting || !!validation_message}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {is_submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  {is_edit ? "Saving…" : "Activating…"}
                </>
              ) : is_edit ? (
                "Save changes"
              ) : charge_now && is_first_billing_today ? (
                `Activate and charge ${formatMoneyCompact(monthly_price)}`
              ) : (
                "Activate subscription"
              )}
            </button>
            <Link
              href={back_href}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Cancel
            </Link>
          </div>
          <p className="px-1 text-center text-xs leading-relaxed text-gray-400">
            The client gets a reminder before each renewal and an email receipt after every payment. Admins in Email Notification
            Settings are notified of every payment.
          </p>
        </aside>
      </div>
    </form>
  );
}
