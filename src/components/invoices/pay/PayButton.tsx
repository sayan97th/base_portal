import React from "react";

interface PayButtonProps {
  label: string;
  is_submitting: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}

export function PayButton({ label, is_submitting, disabled = false, type = "submit", onClick }: PayButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={is_submitting || disabled}
      className="w-full rounded-xl bg-brand-500 py-3.5 sm:py-4 px-4 sm:px-6 text-sm sm:text-base font-semibold text-white shadow-md transition-all hover:bg-brand-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-md"
    >
      {is_submitting ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Processing payment...</span>
        </span>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}

export function PaymentErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:p-5">
      <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
      <p className="text-sm text-red-700 font-medium">{message}</p>
    </div>
  );
}

export function SecurePaymentNote() {
  return (
    <div className="flex items-center justify-center gap-2">
      <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
        />
      </svg>
      <p className="text-xs text-gray-500">
        Payments are encrypted and secured by <span className="font-semibold text-gray-600">Stripe</span>
      </p>
    </div>
  );
}
