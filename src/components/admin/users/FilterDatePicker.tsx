"use client";

import React, { useEffect, useRef } from "react";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.css";

interface FilterDatePickerProps {
  id: string;
  placeholder: string;
  value: string;
  max_date?: string;
  min_date?: string;
  on_change: (iso_value: string) => void;
}

export default function FilterDatePicker({
  id,
  placeholder,
  value,
  max_date,
  min_date,
  on_change,
}: FilterDatePickerProps) {
  const input_ref = useRef<HTMLInputElement>(null);
  const fp_ref = useRef<Instance | null>(null);

  // Initialise flatpickr once on mount
  useEffect(() => {
    if (!input_ref.current) return;

    fp_ref.current = flatpickr(input_ref.current, {
      dateFormat: "M j, Y",
      disableMobile: true,
      maxDate: max_date || undefined,
      minDate: min_date || undefined,
      onChange: (selected_dates) => {
        if (selected_dates.length === 0) { on_change(""); return; }
        const d = selected_dates[0];
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        on_change(iso);
      },
    }) as Instance;

    return () => {
      fp_ref.current?.destroy();
      fp_ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep maxDate / minDate in sync without reinitialising
  useEffect(() => {
    fp_ref.current?.set("maxDate", max_date || undefined);
  }, [max_date]);

  useEffect(() => {
    fp_ref.current?.set("minDate", min_date || undefined);
  }, [min_date]);

  // Sync external value → flatpickr (handles "Clear all")
  useEffect(() => {
    if (!fp_ref.current) return;
    if (!value) {
      fp_ref.current.clear();
    } else {
      // Only update if the stored date differs to avoid infinite loops
      const current = fp_ref.current.selectedDates[0];
      const target = new Date(value + "T00:00:00");
      if (!current || current.toDateString() !== target.toDateString()) {
        fp_ref.current.setDate(target, false);
      }
    }
  }, [value]);

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    fp_ref.current?.clear();
    on_change("");
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>

      <input
        id={id}
        ref={input_ref}
        readOnly
        placeholder={placeholder}
        className="h-9 w-40 cursor-pointer rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-7 text-xs text-gray-700 placeholder-gray-400 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-brand-400 dark:focus:bg-gray-900"
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-2 flex items-center text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
