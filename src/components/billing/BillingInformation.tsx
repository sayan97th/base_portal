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

const BillingInformation: React.FC<BillingInformationProps> = ({
  payment_methods,
  onAddMethod,
  onRemoveMethod,
  onSetDefault,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Billing information
        </h1>
        <Button variant="primary" size="sm" startIcon={<PlusIcon />} onClick={onAddMethod}>
          Add payment method
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {payment_methods.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <svg
                className="h-8 w-8 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No payment methods saved.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
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
    </div>
  );
};

export default BillingInformation;
