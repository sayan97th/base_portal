"use client";

import React, { useState, useCallback, useEffect } from "react";
import PremiumMentionsHeader from "./PremiumMentionsHeader";
import PremiumMentionsPlanGrid from "./PremiumMentionsPlanGrid";
import CalendlyWidget, {
  CalendlyEventPayload,
} from "@/components/shared/CalendlyWidget";
import { premiumMentionsService } from "@/services/client/premium-mentions.service";
import { premium_mentions_plans as fallback_plans } from "./premiumMentionsData";
import type { PremiumMentionsPlan } from "@/types/client/premium-mentions";

const CALENDLY_URL = "https://calendly.com/ernesto-97thfloor/30min";

type Step = "selection" | "schedule";

const PremiumMentionsPage: React.FC = () => {
  const [current_step, setCurrentStep] = useState<Step>("selection");
  const [plans, setPlans] = useState<PremiumMentionsPlan[]>(fallback_plans);
  const [plans_loading, setPlansLoading] = useState(true);
  const [plans_error, setPlansError] = useState<string | null>(null);
  const [selected_plan_id, setSelectedPlanId] = useState<string | null>(null);
  const [appointment_scheduled, setAppointmentScheduled] = useState(false);
  const [is_saving_appointment, setIsSavingAppointment] = useState(false);
  const [appointment_error, setAppointmentError] = useState<string | null>(null);

  useEffect(() => {
    premiumMentionsService
      .fetchPlans()
      .then((data) => setPlans(data.filter((p) => p.is_active)))
      .catch(() => setPlansError("Failed to load plans. Showing default catalog."))
      .finally(() => setPlansLoading(false));
  }, []);

  const selected_plan = plans.find((p) => p.id === selected_plan_id) ?? null;

  const handlePlanSelect = (plan_id: string) => {
    setSelectedPlanId(plan_id);
  };

  const handleNext = () => {
    if (!selected_plan) return;
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
    window.location.reload();
  };

  const handleEventScheduled = useCallback(
    async (payload: CalendlyEventPayload) => {
      if (!selected_plan) return;
      setIsSavingAppointment(true);
      setAppointmentError(null);
      try {
        await premiumMentionsService.saveAppointment({
          event_uri: payload.event_uri,
          invitee_uri: payload.invitee_uri,
          plan_id: selected_plan.id,
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
    [selected_plan]
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="space-y-6">
        {current_step === "selection" && (
          <>
            <PremiumMentionsHeader />

            {plans_error && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
                <p className="text-sm text-yellow-800">{plans_error}</p>
              </div>
            )}

            {plans_loading ? (
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
                Loading plans…
              </div>
            ) : (
              <PremiumMentionsPlanGrid
                plans={plans}
                selected_plan_id={selected_plan_id}
                onSelect={handlePlanSelect}
              />
            )}

            <button
              onClick={handleNext}
              disabled={!selected_plan}
              className="w-full rounded-lg bg-coral-500 px-6 py-3.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-coral-600 disabled:cursor-not-allowed disabled:bg-coral-300"
            >
              Next
            </button>
          </>
        )}

        {current_step === "schedule" && (
          <>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Schedule Your Consultation
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Pick a date and time that works best for you. Our team will
                review your Premium Mentions plan before the call.
              </p>
              {selected_plan && (
                <p className="mt-1 text-sm font-medium text-coral-600 dark:text-coral-400">
                  Selected plan: {selected_plan.name} — $
                  {selected_plan.price_per_month.toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                  /mo
                </p>
              )}
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
                    reach out to get your Premium Mentions campaign started.
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
                Done — Return to Premium Mentions
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

export default PremiumMentionsPage;
