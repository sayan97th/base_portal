"use client";

import React, { useEffect } from "react";

const CALENDLY_URL = "https://calendly.com/ernesto-97thfloor";
const WIDGET_SCRIPT_SRC = "https://assets.calendly.com/assets/external/widget.js";

const CalendlyWidget: React.FC = () => {
  useEffect(() => {
    const existing_script = document.querySelector(
      `script[src="${WIDGET_SCRIPT_SRC}"]`
    );

    if (!existing_script) {
      const script = document.createElement("script");
      script.src = WIDGET_SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div
      className="calendly-inline-widget w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
      data-url={CALENDLY_URL}
      style={{ minWidth: "320px", height: "700px" }}
    />
  );
};

export default CalendlyWidget;
