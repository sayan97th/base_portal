"use client";

import React, { useState, useEffect, useCallback } from "react";
import CallList from "./CallList";
import BookCallView from "./BookCallView";
import RescheduleRequestModal from "./RescheduleRequestModal";
import {
  scheduledCallService,
  ScheduledCallAppointment,
} from "@/services/client/scheduled-call.service";

type ScheduleCallView = "list" | "book";

const ScheduleCallPage: React.FC = () => {
  const [current_view, setCurrentView] = useState<ScheduleCallView>("list");
  const [appointments, setAppointments] = useState<ScheduledCallAppointment[]>(
    []
  );
  const [is_loading, setIsLoading] = useState(true);
  const [fetch_error, setFetchError] = useState<string | null>(null);

  const [reschedule_target, setRescheduleTarget] =
    useState<ScheduledCallAppointment | null>(null);

  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const result = await scheduledCallService.fetchAppointments({
        per_page: 50,
        sort_field: "scheduled_at",
        sort_direction: "desc",
      });
      setAppointments(result.data);
    } catch {
      setFetchError("Could not load your scheduled calls. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleBookingComplete = (
    appointment: ScheduledCallAppointment | null
  ) => {
    if (appointment) {
      setAppointments((prev) => [appointment, ...prev]);
    }
    setCurrentView("list");
  };

  const handleRescheduleRequest = (appointment: ScheduledCallAppointment) => {
    setRescheduleTarget(appointment);
  };

  const handleRescheduleSuccess = (updated: ScheduledCallAppointment) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
    setRescheduleTarget(null);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-8">
      {current_view === "list" && (
        <CallList
          appointments={appointments}
          is_loading={is_loading}
          fetch_error={fetch_error}
          onBook={() => setCurrentView("book")}
          onReschedule={handleRescheduleRequest}
          onRetry={loadAppointments}
        />
      )}

      {current_view === "book" && (
        <BookCallView
          onBack={() => setCurrentView("list")}
          onBookingComplete={handleBookingComplete}
        />
      )}

      <RescheduleRequestModal
        is_open={reschedule_target !== null}
        appointment={reschedule_target}
        on_close={() => setRescheduleTarget(null)}
        on_success={handleRescheduleSuccess}
      />
    </div>
  );
};

export default ScheduleCallPage;
