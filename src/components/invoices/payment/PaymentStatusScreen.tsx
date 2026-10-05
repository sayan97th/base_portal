import React from "react";
import Link from "next/link";

export type PaymentStatusTone = "success" | "neutral" | "warning";

interface PaymentStatusAction {
  label: string;
  href?: string;
  onClick?: () => void;
  is_loading?: boolean;
}

interface PaymentStatusScreenProps {
  tone: PaymentStatusTone;
  title: string;
  description: React.ReactNode;
  primary_action?: PaymentStatusAction;
  secondary_action?: PaymentStatusAction;
  children?: React.ReactNode;
}

const TONE_STYLES: Record<PaymentStatusTone, { badge: string; icon: React.ReactNode }> = {
  success: {
    badge: "bg-emerald-50 text-emerald-600",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />,
  },
  neutral: {
    badge: "bg-gray-100 text-gray-500",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      />
    ),
  },
  warning: {
    badge: "bg-amber-50 text-amber-600",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    ),
  },
};

function ActionButton({ action, variant }: { action: PaymentStatusAction; variant: "primary" | "secondary" }) {
  const class_name =
    variant === "primary"
      ? "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60 sm:w-auto"
      : "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto";

  if (action.href) {
    return (
      <Link href={action.href} className={class_name}>
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} disabled={action.is_loading} className={class_name}>
      {action.is_loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {action.label}
    </button>
  );
}

export default function PaymentStatusScreen({
  tone,
  title,
  description,
  primary_action,
  secondary_action,
  children,
}: PaymentStatusScreenProps) {
  const tone_style = TONE_STYLES[tone];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${tone_style.badge}`}>
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            {tone_style.icon}
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">{title}</h1>
        <div className="mt-3 text-sm leading-relaxed text-gray-600">{description}</div>

        {children}

        {(primary_action || secondary_action) && (
          <div className="mt-8 flex flex-col-reverse justify-center gap-3 sm:flex-row">
            {secondary_action && <ActionButton action={secondary_action} variant="secondary" />}
            {primary_action && <ActionButton action={primary_action} variant="primary" />}
          </div>
        )}
      </div>
    </div>
  );
}
