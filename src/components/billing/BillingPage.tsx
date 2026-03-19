"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Elements } from "@stripe/react-stripe-js";
import BillingInformation from "./BillingInformation";
import PaymentMethodForm from "./PaymentMethodForm";
import { getStripe } from "@/lib/stripe";
import { getToken } from "@/lib/api-client";
import { paymentProfileService } from "@/services/client/payment-profile.service";
import type { PaymentProfile } from "@/types/client/payment-profile";

// Re-export for backward compatibility with billing sub-components
export type PaymentMethod = PaymentProfile;

type BillingView = "list" | "add";

const BillingPage: React.FC = () => {
  const [current_view, setCurrentView] = useState<BillingView>("list");
  const [payment_methods, setPaymentMethods] = useState<PaymentProfile[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setup_client_secret, setSetupClientSecret] = useState<string | null>(null);

  const fetchPaymentProfiles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const profiles = await paymentProfileService.fetchPaymentProfiles();
      setPaymentMethods(profiles);
    } catch {
      setError("Failed to load payment methods. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPaymentProfiles();
  }, [fetchPaymentProfiles]);

  async function handleShowAddForm() {
    setError(null);
    try {
      const token = getToken();
      const response = await fetch("/api/stripe/setup-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to initialize payment form.");
      }

      const data = await response.json();
      setSetupClientSecret(data.client_secret);
      setCurrentView("add");
    } catch {
      setError("Unable to open the payment form. Please try again.");
    }
  }

  function handleBack() {
    setCurrentView("list");
    setSetupClientSecret(null);
    setError(null);
  }

  async function handlePaymentMethodAdded(profile: PaymentProfile) {
    // Re-fetch to ensure list reflects the latest backend state (including is_default logic)
    await fetchPaymentProfiles();
    setCurrentView("list");
    setSetupClientSecret(null);

    // Suppress the stale profile param lint warning — it is used by the caller
    void profile;
  }

  async function handleRemovePaymentMethod(id: string) {
    try {
      await paymentProfileService.deletePaymentProfile(id);
      setPaymentMethods((prev) => {
        const filtered = prev.filter((m) => m.id !== id);
        // Ensure at least one card stays as default
        if (filtered.length > 0 && !filtered.some((m) => m.is_default)) {
          filtered[0] = { ...filtered[0], is_default: true };
        }
        return filtered;
      });
    } catch {
      setError("Failed to remove the payment method. Please try again.");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await paymentProfileService.setDefaultPaymentProfile(id);
      setPaymentMethods((prev) =>
        prev.map((m) => ({ ...m, is_default: m.id === id }))
      );
    } catch {
      setError("Failed to update the default payment method. Please try again.");
    }
  }

  if (current_view === "add" && setup_client_secret) {
    return (
      <Elements stripe={getStripe()}>
        <PaymentMethodForm
          client_secret={setup_client_secret}
          is_first_card={payment_methods.length === 0}
          onBack={handleBack}
          onSuccess={handlePaymentMethodAdded}
        />
      </Elements>
    );
  }

  return (
    <BillingInformation
      payment_methods={payment_methods}
      is_loading={is_loading}
      error={error}
      onAddMethod={handleShowAddForm}
      onRemoveMethod={handleRemovePaymentMethod}
      onSetDefault={handleSetDefault}
      onDismissError={() => setError(null)}
    />
  );
};

export default BillingPage;
