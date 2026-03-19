"use client";

import React from "react";
import Button from "../ui/button/Button";
import { PlusIcon } from "@/icons/index";
import PaymentMethodCard from "./PaymentMethodCard";
import type { PaymentMethod } from "./BillingPage";

interface BillingInformationProps {
  payment_methods: PaymentMethod[];
  onAddMethod: () => void;
  onRemoveMethod: (id: string) => void;
  onSetDefault: (id: string) => void;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-4 ${
        highlight
          ? "border-brand-200 bg-brand-50 dark:border-brand-500/20 dark:bg-brand-500/10"
          : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/2"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          highlight
            ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
            : "bg-gray-200/80 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p
          className={`text-sm font-semibold ${
            highlight
              ? "text-brand-700 dark:text-brand-300"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAddMethod }: { onAddMethod: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20">
      {/* Stacked card illustration */}
      <div className="relative mb-8 h-24 w-36">
        {/* Card shadow / back */}
        <div
          className="absolute bottom-0 right-0 h-20 w-32 rounded-2xl opacity-25"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            transform: "rotate(8deg)",
          }}
        />
        {/* Card mid */}
        <div
          className="absolute bottom-1 right-1 h-20 w-32 rounded-2xl opacity-50"
          style={{
            background: "linear-gradient(135deg, #4527a0 0%, #7b1fa2 100%)",
            transform: "rotate(4deg)",
          }}
        />
        {/* Card front */}
        <div
          className="absolute bottom-2 right-2 flex h-20 w-32 flex-col justify-between overflow-hidden rounded-2xl p-3 shadow-xl"
          style={{ background: "linear-gradient(135deg, #4527a0 0%, #7b1fa2 55%, #6a1b9a 100%)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%)",
            }}
          />
          <div className="flex items-start justify-between">
            <div
              className="h-3 w-5 rounded-sm"
              style={{
                background:
                  "linear-gradient(135deg, #d4a846 0%, #f5d278 50%, #c9952a 100%)",
              }}
            />
            {/* Plus icon hint */}
            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/40">
              <svg
                className="h-2.5 w-2.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          <p className="relative font-mono text-[9px] tracking-[0.18em] text-white/60">
            •••• •••• •••• ••••
          </p>
        </div>
      </div>

      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        No payment methods yet
      </h3>
      <p className="mt-2 max-w-xs text-center text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        Add a credit or debit card to get started. Your information is protected
        with industry-standard encryption.
      </p>

      <button
        onClick={onAddMethod}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add your first card
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const BillingInformation: React.FC<BillingInformationProps> = ({
  payment_methods,
  onAddMethod,
  onRemoveMethod,
  onSetDefault,
}) => {
  const default_method = payment_methods.find((m) => m.is_default);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Payment Methods
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your saved cards and billing preferences.
          </p>
        </div>
        <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={onAddMethod}>
          Add Payment Method
        </Button>
      </div>

      {/* Stats — only visible when at least one card is saved */}
      {payment_methods.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Saved Cards"
            value={`${payment_methods.length} card${payment_methods.length > 1 ? "s" : ""}`}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
                />
              </svg>
            }
          />
          {default_method && (
            <StatCard
              label="Default Card"
              value={`•••• ${default_method.last_four}`}
              highlight
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              }
            />
          )}
        </div>
      )}

      {/* Card list or empty state */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        {payment_methods.length === 0 ? (
          <EmptyState onAddMethod={onAddMethod} />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {payment_methods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                payment_method={method}
                onRemove={() => onRemoveMethod(method.id)}
                onSetDefault={() => onSetDefault(method.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer note */}
      {payment_methods.length > 0 && (
        <div className="flex items-center justify-center gap-1.5">
          <svg
            className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Your payment information is encrypted and stored securely.
          </p>
        </div>
      )}
    </div>
  );
};

export default BillingInformation;
