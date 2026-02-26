"use client";

import React, { useState } from "react";
import CallList from "./CallList";
import ScheduleCallForm from "./ScheduleCallForm";
import { ScheduledCall, scheduled_calls_list } from "./scheduleCallData";

type ScheduleCallView = "list" | "new_call";

const ScheduleCallPage: React.FC = () => {
  const [current_view, setCurrentView] =
    useState<ScheduleCallView>("list");
  const [calls, setCalls] = useState<ScheduledCall[]>(scheduled_calls_list);

  const handleScheduleCall = (call_data: {
    contact_name: string;
    contact_email: string;
    call_type: string;
    scheduled_date: string;
    scheduled_time: string;
    duration: string;
    notes: string;
  }) => {
    const new_call: ScheduledCall = {
      id: `CALL-${String(calls.length + 1).padStart(3, "0")}`,
      contact_name: call_data.contact_name,
      contact_email: call_data.contact_email,
      call_type: call_data.call_type as ScheduledCall["call_type"],
      scheduled_date: new Date(call_data.scheduled_date).toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "short",
          day: "numeric",
        }
      ),
      scheduled_time: call_data.scheduled_time,
      duration: call_data.duration,
      status: "scheduled",
      notes: call_data.notes,
    };

    setCalls((prev) => [new_call, ...prev]);
    setCurrentView("list");
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-8">
      {current_view === "list" && (
        <CallList
          calls={calls}
          onNewCall={() => setCurrentView("new_call")}
        />
      )}
      {current_view === "new_call" && (
        <ScheduleCallForm
          onBack={() => setCurrentView("list")}
          onSubmit={handleScheduleCall}
        />
      )}
    </div>
  );
};

export default ScheduleCallPage;
