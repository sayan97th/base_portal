"use client";

import React, { useState } from "react";
import ModalShell from "@/components/ui/modal/ModalShell";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import Input from "@/components/form/input/InputField";
import {
  scheduledCallService,
  ScheduledCallAppointment,
} from "@/services/client/scheduled-call.service";

interface RescheduleRequestModalProps {
  is_open: boolean;
  appointment: ScheduledCallAppointment | null;
  on_close: () => void;
  on_success: (updated: ScheduledCallAppointment) => void;
}

const RescheduleRequestModal: React.FC<RescheduleRequestModalProps> = ({
  is_open,
  appointment,
  on_close,
  on_success,
}) => {
  const [reason, setReason] = useState("");
  const [preferred_dates, setPreferredDates] = useState("");
  const [is_submitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const is_valid = reason.trim().length > 0;

  const handleClose = () => {
    setReason("");
    setPreferredDates("");
    setError(null);
    on_close();
  };

  const handleSubmit = async () => {
    if (!is_valid || !appointment) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await scheduledCallService.requestReschedule(
        appointment.id,
        {
          reason: reason.trim(),
          preferred_dates: preferred_dates.trim() || undefined,
        }
      );
      on_success(updated);
      handleClose();
    } catch {
      setError(
        "Failed to submit your reschedule request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell is_open={is_open} on_close={handleClose} max_width="max-w-lg">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Request Reschedule
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Let us know why you need to reschedule and your preferred dates.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400">
            {error}
          </div>
        )}

        {/* Reason */}
        <div>
          <Label htmlFor="reschedule_reason">Reason for Rescheduling</Label>
          <TextArea
            placeholder="Please explain why you need to reschedule this call..."
            rows={4}
            value={reason}
            onChange={(value) => setReason(value)}
          />
        </div>

        {/* Preferred Dates */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Label htmlFor="preferred_dates">Preferred Dates</Label>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              optional
            </span>
          </div>
          <Input
            id="preferred_dates"
            name="preferred_dates"
            type="text"
            placeholder="e.g. Any morning next week, May 5–7"
            defaultValue={preferred_dates}
            onChange={(e) => setPreferredDates(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="coral"
            size="sm"
            onClick={handleSubmit}
            disabled={!is_valid || is_submitting}
          >
            {is_submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};

export default RescheduleRequestModal;
