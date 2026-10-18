"use client";

import React, { useState } from "react";
import EmailNotificationSettingsContent from "./EmailNotificationSettingsContent";
import EmailTypesContent from "./EmailTypesContent";
import UserEmailPreferencesContent from "./UserEmailPreferencesContent";
import EmailInterceptorContent from "./EmailInterceptorContent";

type TabKey = "comment_notifications" | "email_types" | "user_preferences" | "email_interceptor";

const TABS: { key: TabKey; label: string; icon_path: string }[] = [
  {
    key: "comment_notifications",
    label: "System Notifications",
    icon_path:
      "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75",
  },
  {
    key: "email_types",
    label: "Email Types",
    icon_path:
      "M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75",
  },
  {
    key: "user_preferences",
    label: "User Preferences",
    icon_path:
      "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  },
  {
    key: "email_interceptor",
    label: "Email Interceptor",
    icon_path: "M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9M12 18.75V5.25",
  },
];

const EmailNotificationSettingsTabs: React.FC = () => {
  const [active_tab, setActiveTab] = useState<TabKey>("comment_notifications");

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex gap-0" role="tablist" aria-label="Email notification settings tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active_tab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                active_tab === tab.key
                  ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon_path} />
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {active_tab === "comment_notifications" && <EmailNotificationSettingsContent />}
      {active_tab === "email_types" && <EmailTypesContent />}
      {active_tab === "user_preferences" && <UserEmailPreferencesContent />}
      {active_tab === "email_interceptor" && <EmailInterceptorContent />}
    </div>
  );
};

export default EmailNotificationSettingsTabs;
