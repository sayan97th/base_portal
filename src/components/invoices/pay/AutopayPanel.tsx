"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { autopayService } from "@/services/client/autopay.service";
import { paymentProfileService } from "@/services/client/payment-profile.service";
import type { AutopayChargeStatus, AutopaySettings } from "@/types/client/autopay";
import type { PaymentProfile } from "@/types/client/payment-profile";
import { formatCardLabel, formatCurrency, getApiErrorMessage, isCardExpired } from "./payUtils";

interface AutopayPanelProps {
  /**
   * "light" for the standalone pay page (always light), "portal" for pages
   * inside the portal layout that support dark mode.
   */
  appearance?: "light" | "portal";
  /** Saved cards already loaded by the parent. When omitted they are fetched. */
  payment_profiles?: PaymentProfile[];
  onSettingsChange?: (settings: AutopaySettings) => void;
}

type PanelMode = "view" | "edit" | "confirm_disable";

const CHARGE_STATUS_STYLES: Record<AutopayChargeStatus, { label: string; class_name: string }> = {
  succeeded:       { label: "Paid",       class_name: "bg-emerald-50 text-emerald-700" },
  failed:          { label: "Failed",     class_name: "bg-red-50 text-red-700" },
  processing:      { label: "Processing", class_name: "bg-blue-50 text-blue-700" },
  skipped:         { label: "Not charged", class_name: "bg-amber-50 text-amber-700" },
  requires_review: { label: "In review",  class_name: "bg-amber-50 text-amber-700" },
};

const formatDate = (iso_date: string | null): string =>
  iso_date ? new Date(iso_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

/**
 * Lets a client turn autopay on (choosing a saved card, an optional
 * per-invoice limit, and accepting the authorization), change it, or turn it
 * off at any time.
 */
export default function AutopayPanel({
  appearance = "portal",
  payment_profiles,
  onSettingsChange,
}: AutopayPanelProps) {
  const dark = (class_names: string) => (appearance === "portal" ? class_names : "");

  const [settings, setSettings] = useState<AutopaySettings | null>(null);
  const [loaded_profiles, setLoadedProfiles] = useState<PaymentProfile[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [load_error, setLoadError] = useState<string | null>(null);
  const [panel_mode, setPanelMode] = useState<PanelMode>("view");
  const [selected_profile_id, setSelectedProfileId] = useState("");
  const [max_amount_input, setMaxAmountInput] = useState("");
  const [is_consent_accepted, setIsConsentAccepted] = useState(false);
  const [is_saving, setIsSaving] = useState(false);
  const [action_error, setActionError] = useState<string | null>(null);
  const [success_message, setSuccessMessage] = useState<string | null>(null);
  const [is_history_open, setIsHistoryOpen] = useState(false);

  const available_profiles = payment_profiles ?? loaded_profiles;
  const usable_profiles = available_profiles.filter(
    (payment_profile) => !isCardExpired(payment_profile.expiry_month, payment_profile.expiry_year)
  );

  // Kept in a ref so an inline callback from the parent never re-triggers the load effect.
  const on_settings_change_ref = useRef(onSettingsChange);
  useEffect(() => {
    on_settings_change_ref.current = onSettingsChange;
  }, [onSettingsChange]);

  const applySettings = useCallback((next_settings: AutopaySettings) => {
    setSettings(next_settings);
    on_settings_change_ref.current?.(next_settings);
  }, []);

  const should_fetch_profiles = payment_profiles === undefined;

  useEffect(() => {
    let is_cancelled = false;

    const loadAutopay = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [settings_response, profiles_response] = await Promise.all([
          autopayService.getAutopaySettings(),
          should_fetch_profiles ? paymentProfileService.fetchPaymentProfiles() : Promise.resolve(null),
        ]);
        if (is_cancelled) return;
        applySettings(settings_response);
        if (profiles_response) setLoadedProfiles(profiles_response);
      } catch {
        if (!is_cancelled) setLoadError("Autopay settings could not be loaded.");
      } finally {
        if (!is_cancelled) setIsLoading(false);
      }
    };

    loadAutopay();
    return () => {
      is_cancelled = true;
    };
  }, [applySettings, should_fetch_profiles]);

  const openEditor = () => {
    const default_profile = usable_profiles.find((payment_profile) => payment_profile.is_default) ?? usable_profiles[0];
    const current_profile_id =
      settings?.payment_profile_id && usable_profiles.some((payment_profile) => payment_profile.id === settings.payment_profile_id)
        ? settings.payment_profile_id
        : default_profile?.id ?? "";

    setSelectedProfileId(current_profile_id);
    setMaxAmountInput(settings?.max_amount ? String(settings.max_amount) : "");
    setIsConsentAccepted(false);
    setActionError(null);
    setSuccessMessage(null);
    setPanelMode("edit");
  };

  const handleSave = async () => {
    const parsed_max_amount = max_amount_input.trim() === "" ? null : Number(max_amount_input);

    if (!selected_profile_id) {
      setActionError("Please choose a card.");
      return;
    }
    if (parsed_max_amount !== null && (isNaN(parsed_max_amount) || parsed_max_amount < 1)) {
      setActionError("The limit must be a positive amount, or leave it empty for no limit.");
      return;
    }
    if (!is_consent_accepted) {
      setActionError("Please accept the autopay authorization to continue.");
      return;
    }

    setIsSaving(true);
    setActionError(null);
    try {
      const was_enabled = settings?.is_enabled ?? false;
      const updated_settings = await autopayService.updateAutopaySettings({
        payment_profile_id: selected_profile_id,
        max_amount: parsed_max_amount,
        consent_accepted: true,
      });
      applySettings(updated_settings);
      setPanelMode("view");
      setSuccessMessage(was_enabled ? "Autopay settings updated." : "Autopay is on. Future invoices will be paid automatically.");
    } catch (error_response: unknown) {
      setActionError(getApiErrorMessage(error_response, "Autopay could not be saved. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable = async () => {
    setIsSaving(true);
    setActionError(null);
    try {
      const updated_settings = await autopayService.disableAutopay();
      applySettings(updated_settings);
      setPanelMode("view");
      setSuccessMessage("Autopay is off. Future invoices will not be charged automatically.");
    } catch (error_response: unknown) {
      setActionError(getApiErrorMessage(error_response, "Autopay could not be turned off. Please try again."));
    } finally {
      setIsSaving(false);
    }
  };

  const container_class = `rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 ${dark("dark:border-gray-800 dark:bg-white/3")}`;
  const title_class = `text-sm font-semibold text-gray-900 ${dark("dark:text-white/90")}`;
  const muted_text_class = `text-xs text-gray-500 ${dark("dark:text-gray-400")}`;
  const body_text_class = `text-sm text-gray-600 ${dark("dark:text-gray-300")}`;
  const secondary_button_class = `inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 ${dark(
    "dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
  )}`;
  const primary_button_class =
    "inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50";
  const input_class = `w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 ${dark(
    "dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
  )}`;

  if (is_loading) {
    return (
      <div className={container_class}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
          <div className="space-y-2">
            <div className="h-3.5 w-28 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-56 animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  if (load_error || !settings) {
    return (
      <div className={container_class}>
        <p className={muted_text_class}>{load_error ?? "Autopay settings could not be loaded."}</p>
      </div>
    );
  }

  const autopay_card_label = settings.payment_profile
    ? formatCardLabel(settings.payment_profile.card_brand, settings.payment_profile.last_four)
    : null;
  const recent_charges = settings.recent_charges.slice(0, 5);
  const was_disabled_by_others =
    !settings.is_enabled && settings.disabled_reason && settings.disabled_by_type && settings.disabled_by_type !== "client";

  return (
    <section className={container_class} aria-labelledby="autopay_panel_title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              settings.is_enabled ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="autopay_panel_title" className={title_class}>
                Autopay
              </h2>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  settings.is_enabled ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {settings.is_enabled ? "On" : "Off"}
              </span>
            </div>
            <p className={`mt-0.5 ${body_text_class}`}>
              {settings.is_enabled && autopay_card_label ? (
                <>
                  New invoices are paid automatically on their due date with{" "}
                  <span className="font-semibold">{autopay_card_label}</span>
                  {settings.max_amount ? <> · up to {formatCurrency(settings.max_amount)} per invoice</> : null}.
                </>
              ) : (
                "Pay future invoices automatically on their due date with a saved card. You can turn it off at any time."
              )}
            </p>
            {settings.is_enabled && settings.enabled_at && (
              <p className={`mt-1 ${muted_text_class}`}>
                Active since {formatDate(settings.enabled_at)}. Invoices issued before that date are not charged automatically.
              </p>
            )}
          </div>
        </div>

        {panel_mode === "view" && (
          <div className="flex shrink-0 gap-2">
            {settings.is_enabled ? (
              <>
                <button type="button" onClick={openEditor} className={secondary_button_class}>
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setSuccessMessage(null);
                    setPanelMode("confirm_disable");
                  }}
                  className={secondary_button_class}
                >
                  Turn off
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openEditor}
                disabled={usable_profiles.length === 0}
                className={primary_button_class}
                title={usable_profiles.length === 0 ? "Save a card first to use autopay" : undefined}
              >
                Set up autopay
              </button>
            )}
          </div>
        )}
      </div>

      {was_disabled_by_others && panel_mode === "view" && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
          Autopay was turned off: {settings.disabled_reason}
        </div>
      )}

      {!settings.is_enabled && usable_profiles.length === 0 && panel_mode === "view" && (
        <p className={`mt-4 ${muted_text_class}`}>
          You don&apos;t have a valid saved card yet. Pay an invoice with a new card and check &quot;Save this card&quot; to enable autopay.
        </p>
      )}

      {success_message && panel_mode === "view" && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700">
          {success_message}
        </div>
      )}

      {panel_mode === "confirm_disable" && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Turn off autopay?</p>
          <p className="mt-1 text-xs text-red-700">
            Future invoices will not be charged automatically. You will need to pay each invoice manually.
          </p>
          {action_error && <p className="mt-2 text-xs font-medium text-red-700">{action_error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleDisable}
              disabled={is_saving}
              className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {is_saving ? "Turning off..." : "Yes, turn off autopay"}
            </button>
            <button type="button" onClick={() => setPanelMode("view")} disabled={is_saving} className={secondary_button_class}>
              Keep it on
            </button>
          </div>
        </div>
      )}

      {panel_mode === "edit" && (
        <div className={`mt-4 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4 ${dark("dark:border-gray-700 dark:bg-gray-900/40")}`}>
          <div>
            <label htmlFor="autopay_card" className={`mb-1.5 block text-xs font-semibold text-gray-700 ${dark("dark:text-gray-300")}`}>
              Card to charge
            </label>
            <select
              id="autopay_card"
              value={selected_profile_id}
              onChange={(change_event) => setSelectedProfileId(change_event.target.value)}
              className={input_class}
            >
              {usable_profiles.map((payment_profile) => (
                <option key={payment_profile.id} value={payment_profile.id}>
                  {formatCardLabel(payment_profile.card_brand, payment_profile.last_four)} — expires{" "}
                  {parseInt(payment_profile.expiry_month, 10)}/{payment_profile.expiry_year}
                  {payment_profile.is_default ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="autopay_max_amount" className={`mb-1.5 block text-xs font-semibold text-gray-700 ${dark("dark:text-gray-300")}`}>
              Maximum per invoice <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                id="autopay_max_amount"
                type="number"
                min={1}
                step="0.01"
                inputMode="decimal"
                placeholder="No limit"
                value={max_amount_input}
                onChange={(change_event) => setMaxAmountInput(change_event.target.value)}
                className={`${input_class} pl-7`}
              />
            </div>
            <p className={`mt-1 ${muted_text_class}`}>
              Invoices above this amount are never charged automatically — you&apos;ll be asked to pay them manually.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={is_consent_accepted}
              onChange={(change_event) => setIsConsentAccepted(change_event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
            />
            <span className={`text-xs leading-relaxed text-gray-600 ${dark("dark:text-gray-300")}`}>{settings.consent_text}</span>
          </label>

          {action_error && <p className="text-xs font-medium text-red-600">{action_error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={handleSave} disabled={is_saving || !is_consent_accepted} className={primary_button_class}>
              {is_saving ? "Saving..." : settings.is_enabled ? "Save changes" : "Turn on autopay"}
            </button>
            <button type="button" onClick={() => setPanelMode("view")} disabled={is_saving} className={secondary_button_class}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {recent_charges.length > 0 && panel_mode === "view" && (
        <div className={`mt-4 border-t border-gray-100 pt-3 ${dark("dark:border-gray-800")}`}>
          <button
            type="button"
            onClick={() => setIsHistoryOpen((is_open) => !is_open)}
            className={`flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 ${dark("dark:text-gray-400 dark:hover:text-white")}`}
            aria-expanded={is_history_open}
          >
            Recent automatic payments
            <svg
              className={`h-3.5 w-3.5 transition-transform ${is_history_open ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {is_history_open && (
            <ul className="mt-2 space-y-2">
              {recent_charges.map((recent_charge) => {
                const status_style = CHARGE_STATUS_STYLES[recent_charge.status] ?? CHARGE_STATUS_STYLES.failed;
                return (
                  <li key={recent_charge.id} className="flex flex-col gap-0.5 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${status_style.class_name}`}>
                        {status_style.label}
                      </span>
                      <span className={`font-medium text-gray-800 ${dark("dark:text-white/90")}`}>
                        Invoice #{recent_charge.invoice_number ?? "—"}
                      </span>
                      <span className={muted_text_class}>{formatDate(recent_charge.created_at)}</span>
                    </div>
                    <div className={`${muted_text_class} sm:text-right`}>
                      {formatCurrency(recent_charge.amount)} · {recent_charge.card_label}
                      {recent_charge.status === "failed" && recent_charge.failure_message && (
                        <span className="block text-red-600">{recent_charge.failure_message}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
