"use client";

import React, { useState } from "react";
import EmailNotificationSettingsContent from "./EmailNotificationSettingsContent";
import EmailInterceptorContent from "./EmailInterceptorContent";

type TabKey = "comment_notifications" | "email_interceptor";

const EmailNotificationSettingsTabs: React.FC = () => {
  const [active_tab, setActiveTab] = useState<TabKey>("comment_notifications");

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex gap-0" aria-label="Email notification settings tabs">
          <button
            onClick={() => setActiveTab("comment_notifications")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              active_tab === "comment_notifications"
                ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
            Comment Notifications
          </button>
          <button
            onClick={() => setActiveTab("email_interceptor")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              active_tab === "email_interceptor"
                ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9M12 18.75V5.25"
              />
            </svg>
            Email Interceptor
          </button>
        </nav>
      </div>

      {active_tab === "comment_notifications" && <EmailNotificationSettingsContent />}
      {active_tab === "email_interceptor" && <EmailInterceptorContent />}
    </div>
  );
};

export default EmailNotificationSettingsTabs;
