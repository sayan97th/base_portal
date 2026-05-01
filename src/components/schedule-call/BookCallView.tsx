"use client";

import React, { useState } from "react";
import Button from "@/components/ui/button/Button";
import CalendlyWidget, {
  CalendlyEventPayload,
} from "@/components/shared/CalendlyWidget";
import {
  scheduledCallService,
  ScheduledCallAppointment,
} from "@/services/client/scheduled-call.service";

const CALENDLY_URL =
  process.env.NEXT_PUBLIC_SCHEDULE_CALL_CALENDLY_URL ||
  "https://calendly.com/ernesto-97thfloor/30min";

interface BookCallViewProps {
  onBack: () => void;
  onBookingComplete: (appointment: ScheduledCallAppointment | null) => void;
}

const BookCallView: React.FC<BookCallViewProps> = ({
  onBack,
  onBookingComplete,
}) => {
  const [is_saving, setIsSaving] = useState(false);
  const [is_booked, setIsBooked] = useState(false);
  const [booked_appointment, setBookedAppointment] =
    useState<ScheduledCallAppointment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEventScheduled = async (payload: CalendlyEventPayload) => {
    setIsSaving(true);
    setError(null);
    try {
      const appointment = await scheduledCallService.saveAppointment({
        event_uri: payload.event_uri,
        invitee_uri: payload.invitee_uri,
      });
      setBookedAppointment(appointment);
      setIsBooked(true);
    } catch {
      setError(
        "Your call was booked on Calendly, but we could not save it to our system. Please contact support."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (is_booked) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label="Go back"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Schedule a Call
          </h1>
        </div>

        <div className="flex flex-col items-center gap-5 rounded-xl border border-success-200 bg-success-50 p-10 text-center dark:border-success-800 dark:bg-success-900/20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-100 dark:bg-success-900/40">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-success-600 dark:text-success-400"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Call Booked Successfully!
            </h2>
            <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">
              Your call has been scheduled. You will receive a confirmation
              email from Calendly shortly with all the details.
            </p>
          </div>
          <Button
            variant="coral"
            size="sm"
            onClick={() => onBookingComplete(booked_appointment)}
          >
            View My Scheduled Calls
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Go back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Schedule a Call
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose a date and time that works for you.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400">
          {error}
        </div>
      )}

      {is_saving && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-400">
          Saving your appointment&hellip;
        </div>
      )}

      <CalendlyWidget
        calendly_url={CALENDLY_URL}
        onEventScheduled={handleEventScheduled}
      />
    </div>
  );
};

export default BookCallView;
