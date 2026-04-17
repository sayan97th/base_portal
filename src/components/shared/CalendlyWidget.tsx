"use client";

import React from "react";
import { InlineWidget, useCalendlyEventListener } from "react-calendly";

export interface CalendlyEventPayload {
  event_uri: string;
  invitee_uri: string;
}

interface CalendlyWidgetProps {
  calendly_url: string;
  onEventScheduled?: (payload: CalendlyEventPayload) => void;
}

const CalendlyWidget: React.FC<CalendlyWidgetProps> = ({
  calendly_url,
  onEventScheduled,
}) => {
  useCalendlyEventListener({
    onEventScheduled: (e) => {
      if (!onEventScheduled) return;
      onEventScheduled({
        event_uri: e.data.payload.event.uri,
        invitee_uri: e.data.payload.invitee.uri,
      });
    },
  });

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-100 shadow-sm">
      <InlineWidget
        url={calendly_url}
        styles={{ minWidth: "350px", height: "700px" }}
      />
    </div>
  );
};

export default CalendlyWidget;
