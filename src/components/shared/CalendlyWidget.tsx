"use client";

import React, { useEffect, useRef } from "react";

export interface CalendlyEventPayload {
  event_uri: string;
  invitee_uri: string;
}

interface CalendlyWidgetProps {
  calendly_url: string;
  onEventScheduled?: (payload: CalendlyEventPayload) => void;
}

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: {
        url: string;
        parentElement: HTMLElement;
      }) => void;
    };
  }
}

const CALENDLY_SCRIPT_SRC =
  "https://assets.calendly.com/assets/external/widget.js";

const CalendlyWidget: React.FC<CalendlyWidgetProps> = ({
  calendly_url,
  onEventScheduled,
}) => {
  const container_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initWidget = () => {
      if (!container_ref.current || !window.Calendly) return;
      window.Calendly.initInlineWidget({
        url: calendly_url,
        parentElement: container_ref.current,
      });
    };

    const existing_script = document.querySelector(
      `script[src="${CALENDLY_SCRIPT_SRC}"]`
    );

    if (window.Calendly) {
      // Script already loaded — initialize the widget directly
      initWidget();
    } else if (!existing_script) {
      // First load — append script and initialize on load
      const script = document.createElement("script");
      script.src = CALENDLY_SCRIPT_SRC;
      script.async = true;
      script.onload = initWidget;
      document.body.appendChild(script);
    } else {
      // Script tag exists but still loading — poll until ready
      const interval = setInterval(() => {
        if (window.Calendly) {
          clearInterval(interval);
          initWidget();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [calendly_url]);

  useEffect(() => {
    if (!onEventScheduled) return;

    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin === "https://calendly.com" &&
        event.data?.event === "calendly.event_scheduled"
      ) {
        const { payload } = event.data;
        onEventScheduled({
          event_uri: payload?.event?.uri ?? "",
          invitee_uri: payload?.invitee?.uri ?? "",
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onEventScheduled]);

  return (
    <div
      ref={container_ref}
      className="w-full overflow-hidden rounded-xl border border-gray-100 shadow-sm"
      style={{ minWidth: "320px", height: "700px" }}
    />
  );
};

export default CalendlyWidget;
