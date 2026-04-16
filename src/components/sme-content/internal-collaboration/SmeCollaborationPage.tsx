"use client";

import React, { useState, useMemo, useCallback } from "react";
import SmeCollaborationHeader from "./SmeCollaborationHeader";
import SmeServiceGrid from "./SmeServiceGrid";
import OrderSummary, { SummaryItem } from "@/components/shared/OrderSummary";
import { sme_service_tiers } from "./smeCollaborationData";
import CalendlyWidget, {
  CalendlyEventPayload,
} from "@/components/shared/CalendlyWidget";
import { smeContentService } from "@/services/client/sme-content.service";

const CALENDLY_URL = "https://calendly.com/ernesto-97thfloor/30min";

type Step = "selection" | "schedule";

const SmeCollaborationPage: React.FC = () => {
  const [current_step, setCurrentStep] = useState<Step>("selection");
  const [selected_quantities, setSelectedQuantities] = useState<
    Record<string, number>
  >({});
  const [appointment_scheduled, setAppointmentScheduled] = useState(false);
  const [is_saving_appointment, setIsSavingAppointment] = useState(false);
  const [appointment_error, setAppointmentError] = useState<string | null>(null);

  const selected_items: SummaryItem[] = useMemo(() => {
    return sme_service_tiers
      .filter((tier) => (selected_quantities[tier.id] || 0) > 0)
      .map((tier) => ({
        id: tier.id,
        label: tier.label,
        quantity: selected_quantities[tier.id],
        unit_price: tier.price,
      }));
  }, [selected_quantities]);

  const total = useMemo(() => {
    return sme_service_tiers.reduce((sum, tier) => {
      const qty = selected_quantities[tier.id] || 0;
      return sum + qty * tier.price;
    }, 0);
  }, [selected_quantities]);

  const handleQuantityChange = (tier_id: string, quantity: number) => {
    setSelectedQuantities((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[tier_id];
      } else {
        next[tier_id] = quantity;
      }
      return next;
    });
  };

  const handleNext = () => {
    if (selected_items.length === 0) return;
    setCurrentStep("schedule");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToSelection = () => {
    setCurrentStep("selection");
    setAppointmentScheduled(false);
    setAppointmentError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEventScheduled = useCallback(
    async (payload: CalendlyEventPayload) => {
      setIsSavingAppointment(true);
      setAppointmentError(null);
      try {
        await smeContentService.saveAppointment({
          event_uri: payload.event_uri,
          invitee_uri: payload.invitee_uri,
          selected_tiers: selected_quantities,
        });
        setAppointmentScheduled(true);
      } catch {
        setAppointmentError(
          "Your appointment was booked in Calendly, but we could not save it on our end. Please contact support."
        );
        setAppointmentScheduled(true);
      } finally {
        setIsSavingAppointment(false);
      }
    },
    [selected_quantities]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="col-span-12 space-y-6 lg:col-span-8">
          {current_step === "selection" && (
            <>
              <SmeCollaborationHeader />
              <SmeServiceGrid
                selected_quantities={selected_quantities}
                onQuantityChange={handleQuantityChange}
              />

              <button
                onClick={handleNext}
                disabled={selected_items.length === 0}
                className="w-full rounded-lg bg-coral-500 px-6 py-3.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:bg-coral-300"
              >
                Next
              </button>
            </>
          )}

          {current_step === "schedule" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Schedule Your Consultation
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Pick a date and time that works best for you. Our team will
                  review your content request before the call.
                </p>
              </div>

              {appointment_scheduled && (
                <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Appointment confirmed!
                    </p>
                    <p className="mt-0.5 text-sm text-green-700">
                      You should receive a calendar invite shortly. Our team
                      will reach out to discuss your content request.
                    </p>
                  </div>
                </div>
              )}

              {is_saving_appointment && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                  <svg
                    className="h-4 w-4 animate-spin text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <p className="text-sm text-blue-700">Saving your appointment…</p>
                </div>
              )}

              {appointment_error && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
                  <p className="text-sm text-yellow-800">{appointment_error}</p>
                </div>
              )}

              {!appointment_scheduled && (
                <CalendlyWidget
                  calendly_url={CALENDLY_URL}
                  onEventScheduled={handleEventScheduled}
                />
              )}

              <button
                onClick={handleBackToSelection}
                className="w-full rounded-lg border border-gray-200 bg-white px-6 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50"
              >
                Back to Selection
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4">
          <OrderSummary
            selected_items={selected_items}
            total={total}
          />
        </div>
      </div>
    </div>
  );
};

export default SmeCollaborationPage;
