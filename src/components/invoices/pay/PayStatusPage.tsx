import React from "react";

// ── Status / feedback pages ───────────────────────────────────────────────────

export type StatusIcon = "check" | "lock" | "warning" | "document" | "info";

interface StatusPageProps {
  icon: StatusIcon;
  title: string;
  description: string;
  success?: boolean;
  action_link?: { label: string; href: string };
}

export default function PayStatusPage({ icon, title, description, success = false, action_link }: StatusPageProps) {
  const icon_background = success
    ? "bg-emerald-100 dark:bg-emerald-500/15"
    : "bg-gray-100 dark:bg-gray-800";
  const icon_color_class = success ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400";

  const icon_map: Record<StatusIcon, React.ReactNode> = {
    check: (
      <svg className={`h-8 w-8 ${icon_color_class}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    lock: (
      <svg className={`h-8 w-8 ${icon_color_class}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    warning: (
      <svg className={`h-8 w-8 ${icon_color_class}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
    document: (
      <svg className={`h-8 w-8 ${icon_color_class}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    info: (
      <svg className={`h-8 w-8 ${icon_color_class}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 sm:p-10 md:p-12 text-center shadow-lg">
        <div className={`mx-auto mb-6 sm:mb-8 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full ${icon_background}`}>
          {icon_map[icon]}
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-2 sm:mt-3 text-sm sm:text-base leading-relaxed text-gray-600">{description}</p>
        {success && (
          <div className="mt-6 sm:mt-8 rounded-xl bg-emerald-50 px-4 sm:px-5 py-3 sm:py-4">
            <p className="text-xs sm:text-sm text-emerald-700 font-medium">
              A confirmation email will be sent to you shortly.
            </p>
          </div>
        )}
        {action_link && (
          <a
            href={action_link.href}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {action_link.label}
          </a>
        )}
      </div>
    </div>
  );
}
