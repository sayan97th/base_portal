"use client";

interface IntakeValidationBannerProps {
  message: string;
}

/** Amber warning banner shown when the user tries to continue with an incomplete intake form. */
export default function IntakeValidationBanner({ message }: IntakeValidationBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
      <svg
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
        />
      </svg>
      <div>
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Incomplete intake form
        </p>
        <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{message}</p>
      </div>
    </div>
  );
}
