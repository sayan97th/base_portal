"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import SmeAuthoredHeader from "./SmeAuthoredHeader";
import SmeAuthoredGrid from "./SmeAuthoredGrid";
import CalendlyWidget, {
  CalendlyEventPayload,
} from "@/components/shared/CalendlyWidget";
import { smeAppointmentService } from "@/services/client/sme-appointment.service";
import {
  smeAuthoredService,
  SmeAuthoredTier,
} from "@/services/client/sme-authored.service";

const CALENDLY_URL = "https://calendly.com/ernesto-97thfloor/30min";

type Step = "selection" | "schedule";

const SmeAuthoredPage: React.FC = () => {
  const router = useRouter();
  const [current_step, setCurrentStep] = useState<Step>("selection");
  const [service_tiers, setServiceTiers] = useState<SmeAuthoredTier[]>([]);
  const [is_loading_tiers, setIsLoadingTiers] = useState(true);
  const [tiers_error, setTiersError] = useState<string | null>(null);
  const [selected_quantities, setSelectedQuantities] = useState<
    Record<string, number>
  >({});
  const [appointment_scheduled, setAppointmentScheduled] = useState(false);
  const [is_saving_appointment, setIsSavingAppointment] = useState(false);
  const [appointment_error, setAppointmentError] = useState<string | null>(null);

  useEffect(() => {
    smeAuthoredService
      .fetchServices()
      .then(setServiceTiers)
      .catch(() =>
        setTiersError("Failed to load services. Please refresh the page.")
      )
      .finally(() => setIsLoadingTiers(false));
  }, []);

  const has_selection = service_tiers.some(
    (tier) => (selected_quantities[tier.id] || 0) > 0
  );

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
    if (!has_selection) return;
    setCurrentStep("schedule");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBackToSelection = () => {
    setCurrentStep("selection");
    setAppointmentScheduled(false);
    setAppointmentError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFinish = () => {
    router.push("/sme-content");
  };

  const handleEventScheduled = useCallback(
    async (payload: CalendlyEventPayload) => {
      setIsSavingAppointment(true);
      setAppointmentError(null);
      try {
        await smeAppointmentService.saveAppointment({
          event_uri: payload.event_uri,
          invitee_uri: payload.invitee_uri,
          selected_tiers: selected_quantities,
          service_type: "authored",
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
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="space-y-6">
        {current_step === "selection" && (
          <>
            <SmeAuthoredHeader />

            {is_loading_tiers && (
              <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                <svg
                  className="h-4 w-4 animate-spin text-gray-400"
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
                Loading services…
              </div>
            )}

            {tiers_error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">{tiers_error}</p>
              </div>
            )}

            {!is_loading_tiers && !tiers_error && (
              <SmeAuthoredGrid
                tiers={service_tiers}
                selected_quantities={selected_quantities}
                onQuantityChange={handleQuantityChange}
              />
            )}

            <button
              onClick={handleNext}
              disabled={!has_selection}
              className="w-full rounded-lg bg-coral-500 px-6 py-3.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:bg-coral-300"
            >
              Next
            </button>
          </>
        )}

        {current_step === "schedule" && (
          <>
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
                    You should receive a calendar invite shortly. Our team will
                    reach out to discuss your content request.
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

            {appointment_scheduled ? (
              <button
                onClick={handleFinish}
                className="w-full rounded-lg bg-coral-500 px-6 py-3.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-coral-600"
              >
                Done — Return to SME Content
              </button>
            ) : (
              <button
                onClick={handleBackToSelection}
                className="w-full rounded-lg border border-gray-200 bg-white px-6 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50"
              >
                Back to Selection
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SmeAuthoredPage;
