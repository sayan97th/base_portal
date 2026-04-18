"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Elements } from "@stripe/react-stripe-js";
import SeoPackagesHeader from "./SeoPackagesHeader";
import SeoPackageGrid from "./SeoPackageGrid";
import SeoPackageOrderSummary from "./SeoPackageOrderSummary";
import CheckoutStep, {
  BillingAddress,
  type CheckoutStepHandle,
} from "@/components/shared/CheckoutStep";
import { seo_packages as fallback_packages } from "./seoPackageData";
import { seoPackagesService } from "@/services/client/seo-packages.service";
import { useNotifications } from "@/context/NotificationsContext";
import { useBillingAddress } from "@/hooks/useBillingAddress";
import { getStripe } from "@/lib/stripe";
import type { SeoPackage } from "@/types/client/seo-packages";

type Step = "selection" | "checkout";

const SeoPackagesPage: React.FC = () => {
  const router = useRouter();
  const { addNotification } = useNotifications();

  const [packages, setPackages] = useState<SeoPackage[]>(fallback_packages);
  const [packages_loading, setPackagesLoading] = useState(true);

  const [selected_package_id, setSelectedPackageId] = useState<string | null>(null);
  const [current_step, setCurrentStep] = useState<Step>("selection");
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  const [billing_address, setBillingAddress] = useState<BillingAddress>({
    address: "",
    city: "",
    country: "United States",
    state: "Alabama",
    postal_code: "",
    company: "",
  });

  const { saved_billing_address, has_saved_address } = useBillingAddress();
  const checkout_ref = useRef<CheckoutStepHandle>(null);
  const [checkout_is_processing, setCheckoutIsProcessing] = useState(false);

  const loadPackages = useCallback(async () => {
    setPackagesLoading(true);
    try {
      const data = await seoPackagesService.fetchSeoPackages();
      if (data.length > 0) setPackages(data.filter((p) => p.is_active));
    } catch {
      // fallback data already in state
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const selected_package = packages.find((p) => p.id === selected_package_id) ?? null;

  const handlePackageSelect = (package_id: string) => {
    setSelectedPackageId((prev) => (prev === package_id ? null : package_id));
  };

  const handleBillingChange = (field: keyof BillingAddress, value: string) => {
    setBillingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplySavedAddress = useCallback(() => {
    if (saved_billing_address) setBillingAddress(saved_billing_address);
  }, [saved_billing_address]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleContinue = () => {
    if (!selected_package_id) return;
    if (has_saved_address && saved_billing_address) {
      const is_billing_empty =
        !billing_address.address && !billing_address.city && !billing_address.postal_code;
      if (is_billing_empty) setBillingAddress(saved_billing_address);
    }
    setCurrentStep("checkout");
    scrollToTop();
  };

  const handlePrevious = () => {
    setCurrentStep("selection");
    scrollToTop();
  };

  const handleComplete = async (
    payment_intent_id: string,
    is_using_saved_method: boolean
  ) => {
    if (!selected_package) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await seoPackagesService.createSeoSubscription({
        package_id: selected_package.id,
        total_amount: selected_package.price_per_month,
        billing: is_using_saved_method
          ? { company: null, address: "", city: "", state: "", country: "", postal_code: "" }
          : {
              company: billing_address.company || null,
              address: billing_address.address,
              city: billing_address.city,
              state: billing_address.state,
              country: billing_address.country,
              postal_code: billing_address.postal_code,
            },
        payment: { payment_method_id: payment_intent_id },
      });

      const formatted_amount = selected_package.price_per_month.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      await addNotification({
        type: "order",
        message: "Your SEO subscription has been activated successfully.",
        preview_text: `${selected_package.name} · $${formatted_amount}/month`,
        link: `/orders`,
      });

      router.push(`/orders`);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Something went wrong. Please try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl">
        {/* Selection step */}
        {current_step === "selection" && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-6 lg:col-span-8">
              <SeoPackagesHeader />
              {packages_loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
                    />
                  ))}
                </div>
              ) : (
                <SeoPackageGrid
                  packages={packages}
                  selected_package_id={selected_package_id}
                  onPackageSelect={handlePackageSelect}
                />
              )}
            </div>

            <div className="col-span-12 lg:col-span-4">
              <SeoPackageOrderSummary
                selected_package={selected_package}
                action_label="Continue to Checkout"
                onAction={handleContinue}
                is_action_disabled={!selected_package_id}
              />
            </div>
          </div>
        )}

        {/* Checkout step — Elements wraps both columns so the summary button
            can trigger CheckoutStep's Stripe hooks via the imperative ref */}
        {current_step === "checkout" && (
          <Elements stripe={getStripe()}>
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-8">
                <CheckoutStep
                  ref={checkout_ref}
                  billing_address={billing_address}
                  onBillingChange={handleBillingChange}
                  onPrevious={handlePrevious}
                  onComplete={handleComplete}
                  is_loading={is_submitting}
                  error_message={submit_error}
                  total_amount={selected_package?.price_per_month ?? 0}
                  saved_billing_address={saved_billing_address}
                  onApplySavedAddress={handleApplySavedAddress}
                  onProcessingChange={setCheckoutIsProcessing}
                />
              </div>

              <div className="col-span-12 lg:col-span-4">
                <SeoPackageOrderSummary
                  selected_package={selected_package}
                  action_label="Continue to Checkout"
                  onAction={() => {}}
                  is_action_disabled
                  checkout_action={{
                    total: selected_package?.price_per_month ?? 0,
                    is_processing: checkout_is_processing || is_submitting,
                    onSubmit: () => checkout_ref.current?.triggerSubmit(),
                  }}
                />
              </div>
            </div>
          </Elements>
        )}
      </div>
    </div>
  );
};

export default SeoPackagesPage;
