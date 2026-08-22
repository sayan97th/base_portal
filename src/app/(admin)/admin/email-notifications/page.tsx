import EmailNotificationSettingsTabs from "@/components/admin/email-notifications/EmailNotificationSettingsTabs";

export const metadata = {
  title: "Email Notification Settings | Admin",
};

export default function EmailNotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 dark:bg-brand-500/15">
          <svg
            className="h-6 w-6 text-brand-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Email Notification Settings
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Manage who gets notified by email, and audit exactly what goes out
          </p>
        </div>
      </div>

      <EmailNotificationSettingsTabs />
    </div>
  );
}
