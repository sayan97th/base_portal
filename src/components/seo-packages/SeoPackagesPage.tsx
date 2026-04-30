"use client";

import React, { useState, useCallback, useEffect } from "react";
import SeoPackagesHeader from "./SeoPackagesHeader";
import SeoPackageGrid from "./SeoPackageGrid";
import SeoPackageOrderSummary from "./SeoPackageOrderSummary";
import CalendlyWidget, {
  CalendlyEventPayload,
} from "@/components/shared/CalendlyWidget";
import { seo_packages as fallback_packages } from "./seoPackageData";
import { seoPackagesService } from "@/services/client/seo-packages.service";
import type { SeoPackage } from "@/types/client/seo-packages";

const CALENDLY_URL = "https://calendly.com/ernesto-97thfloor/30min";

type Step = "selection" | "schedule";

const SeoPackagesPage: React.FC = () => {
  const [packages, setPackages] = useState<SeoPackage[]>(fallback_packages);
  const [packages_loading, setPackagesLoading] = useState(true);

  const [selected_package_id, setSelectedPackageId] = useState<string | null>(null);
  const [current_step, setCurrentStep] = useState<Step>("selection");

  const [appointment_scheduled, setAppointmentScheduled] = useState(false);
  const [is_saving_appointment, setIsSavingAppointment] = useState(false);
  const [appointment_error, setAppointmentError] = useState<string | null>(null);

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

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const handleContinue = () => {
    if (!selected_package_id) return;
    setCurrentStep("schedule");
    scrollToTop();
  };

  const handleBackToSelection = () => {
    setCurrentStep("selection");
    setAppointmentScheduled(false);
    setAppointmentError(null);
    scrollToTop();
  };

  const handleFinish = () => {
    window.location.reload();
  };

  const handleEventScheduled = useCallback(
    async (payload: CalendlyEventPayload) => {
      if (!selected_package) return;
      setIsSavingAppointment(true);
      setAppointmentError(null);
      try {
        await seoPackagesService.saveAppointment({
          event_uri: payload.event_uri,
          invitee_uri: payload.invitee_uri,
          package_id: selected_package.id,
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
    [selected_package]
  );

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
                action_label="Schedule a Consultation"
                onAction={handleContinue}
                is_action_disabled={!selected_package_id}
              />
            </div>
          </div>
        )}

        {/* Schedule step */}
        {current_step === "schedule" && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 space-y-6 lg:col-span-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Schedule Your SEO Consultation
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Pick a date and time that works best for you. Our team will
                  review your selected plan before the call.
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
                      will reach out to discuss your SEO plan.
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
                  Done — Return to SEO Packages
                </button>
              ) : (
                <button
                  onClick={handleBackToSelection}
                  className="w-full rounded-lg border border-gray-200 bg-white px-6 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Back to Plan Selection
                </button>
              )}
            </div>

            <div className="col-span-12 lg:col-span-4">
              <SeoPackageOrderSummary
                selected_package={selected_package}
                action_label="Schedule a Consultation"
                onAction={() => {}}
                is_action_disabled
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeoPackagesPage;
