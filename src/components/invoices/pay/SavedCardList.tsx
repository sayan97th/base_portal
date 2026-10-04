"use client";

import React from "react";
import type { PaymentProfile } from "@/types/client/payment-profile";
import CardBrandThumb from "./CardBrandThumb";
import { formatCardBrand, isCardExpired } from "./payUtils";

export const NEW_CARD_OPTION = "new_card";

interface SavedCardListProps {
  payment_profiles: PaymentProfile[];
  selected_option: string;
  autopay_profile_id?: string | null;
  disabled?: boolean;
  onSelect: (option: string) => void;
}

/**
 * Radio list of the client's saved cards plus a "Use a different card" option.
 * Expired cards are shown but cannot be selected.
 */
export default function SavedCardList({
  payment_profiles,
  selected_option,
  autopay_profile_id,
  disabled = false,
  onSelect,
}: SavedCardListProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-5">
        <div>
          <p className="text-sm font-semibold text-gray-900">Payment method</p>
          <p className="text-xs text-gray-500">Pay with a saved card or enter a new one</p>
        </div>
      </div>

      <div role="radiogroup" aria-label="Payment method" className="divide-y divide-gray-100">
        {payment_profiles.map((payment_profile) => {
          const is_expired = isCardExpired(payment_profile.expiry_month, payment_profile.expiry_year);
          const is_selected = selected_option === payment_profile.id;

          return (
            <label
              key={payment_profile.id}
              className={`flex items-center gap-3 px-4 py-3.5 transition-colors sm:gap-4 sm:px-5 ${
                is_expired || disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"
              } ${is_selected ? "bg-brand-50/60" : ""}`}
            >
              <input
                type="radio"
                name="invoice_payment_method"
                value={payment_profile.id}
                checked={is_selected}
                disabled={is_expired || disabled}
                onChange={() => onSelect(payment_profile.id)}
                className="h-4 w-4 shrink-0 accent-brand-500"
              />
              <CardBrandThumb
                card_brand={payment_profile.card_brand}
                last_four={payment_profile.last_four}
                is_muted={is_expired}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCardBrand(payment_profile.card_brand)} •••• {payment_profile.last_four}
                  </span>
                  {payment_profile.is_default && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      Default
                    </span>
                  )}
                  {autopay_profile_id === payment_profile.id && (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-600">
                      Autopay
                    </span>
                  )}
                  {is_expired && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">
                      Expired
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  Expires {parseInt(payment_profile.expiry_month, 10)} / {payment_profile.expiry_year}
                  {payment_profile.cardholder_name ? ` · ${payment_profile.cardholder_name}` : ""}
                </p>
              </div>
              {is_selected && (
                <svg className="h-5 w-5 shrink-0 text-brand-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </label>
          );
        })}

        <label
          className={`flex items-center gap-3 px-4 py-3.5 transition-colors sm:gap-4 sm:px-5 ${
            disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"
          } ${selected_option === NEW_CARD_OPTION ? "bg-brand-50/60" : ""}`}
        >
          <input
            type="radio"
            name="invoice_payment_method"
            value={NEW_CARD_OPTION}
            checked={selected_option === NEW_CARD_OPTION}
            disabled={disabled}
            onChange={() => onSelect(NEW_CARD_OPTION)}
            className="h-4 w-4 shrink-0 accent-brand-500"
          />
          <div className="flex h-9 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-gray-300 text-gray-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold text-gray-900">Use a different card</span>
            <p className="mt-0.5 text-xs text-gray-500">Enter new credit or debit card details</p>
          </div>
        </label>
      </div>
    </div>
  );
}
