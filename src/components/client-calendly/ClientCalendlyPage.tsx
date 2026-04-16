"use client";

import React from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import CalendlyWidget from "./CalendlyWidget";

const ClientCalendlyPage: React.FC = () => {
  return (
    <div>
      <PageBreadcrumb pageTitle="Book an Appointment" />

      {/* Header section */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Schedule a Meeting
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl">
          Pick a date and time that works best for you. We&apos;ll confirm your
          appointment and send you a calendar invite with all the details.
        </p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
            <svg
              className="text-brand-500 dark:text-brand-400"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Select a Date
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Choose from available time slots on the calendar below.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
            <svg
              className="text-brand-500 dark:text-brand-400"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Pick a Time
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              All times are shown in your local timezone automatically.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-500/10">
            <svg
              className="text-brand-500 dark:text-brand-400"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.86a16 16 0 0 0 6 6l1.27-.85a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Instant Confirmation
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Receive a confirmation email with your meeting details right away.
            </p>
          </div>
        </div>
      </div>

      {/* Calendly widget */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 shadow-sm">
        <CalendlyWidget />
      </div>
    </div>
  );
};

export default ClientCalendlyPage;
