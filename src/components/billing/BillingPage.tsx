"use client";

import React, { useState } from "react";
import BillingInformation from "./BillingInformation";
import PaymentMethodForm from "./PaymentMethodForm";

export type PaymentMethod = {
  id: string;
  card_brand: string;
  last_four: string;
  expiry_month: string;
  expiry_year: string;
  is_default: boolean;
};

type BillingView = "list" | "add";

const BillingPage: React.FC = () => {
  const [current_view, setCurrentView] = useState<BillingView>("list");
  const [payment_methods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  function handleAddPaymentMethod(method: PaymentMethod) {
    setPaymentMethods((prev) => {
      if (prev.length === 0) {
        return [{ ...method, is_default: true }];
      }
      if (method.is_default) {
        return [
          ...prev.map((m) => ({ ...m, is_default: false })),
          method,
        ];
      }
      return [...prev, method];
    });
    setCurrentView("list");
  }

  function handleRemovePaymentMethod(id: string) {
    setPaymentMethods((prev) => {
      const filtered = prev.filter((m) => m.id !== id);
      if (filtered.length > 0 && !filtered.some((m) => m.is_default)) {
        filtered[0].is_default = true;
      }
      return [...filtered];
    });
  }

  function handleSetDefault(id: string) {
    setPaymentMethods((prev) =>
      prev.map((m) => ({ ...m, is_default: m.id === id }))
    );
  }

  if (current_view === "add") {
    return (
      <PaymentMethodForm
        onBack={() => setCurrentView("list")}
        onSubmit={handleAddPaymentMethod}
      />
    );
  }

  return (
    <BillingInformation
      payment_methods={payment_methods}
      onAddMethod={() => setCurrentView("add")}
      onRemoveMethod={handleRemovePaymentMethod}
      onSetDefault={handleSetDefault}
    />
  );
};

export default BillingPage;
