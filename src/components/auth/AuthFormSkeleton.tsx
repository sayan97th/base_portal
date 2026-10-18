import React from "react";

type Props = {
  field_count?: number;
  show_social_button?: boolean;
};

// Placeholder rendered while a client side auth form is loading. It mirrors
// the real form dimensions so the page does not shift when the form appears.
export default function AuthFormSkeleton({
  field_count = 2,
  show_social_button = false,
}: Props) {
  return (
    <div className="flex w-full flex-1 flex-col" aria-busy="true">
      <span className="sr-only">Loading form</span>

      <div className="mx-auto mb-5 w-full max-w-md sm:pt-10">
        <div className="h-5 w-36 animate-pulse rounded-md bg-gray-100 dark:bg-white/5" />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 animate-pulse flex-col justify-center">
        <div className="mb-5 sm:mb-8">
          <div className="mb-3 h-8 w-40 rounded-lg bg-gray-200 dark:bg-white/10" />
          <div className="h-4 w-64 rounded-md bg-gray-100 dark:bg-white/5" />
        </div>

        {show_social_button && (
          <>
            <div className="h-12 w-full rounded-lg bg-gray-100 dark:bg-white/5" />
            <div className="my-6 h-px w-full bg-gray-200 dark:bg-gray-800 sm:my-8" />
          </>
        )}

        <div className="space-y-6">
          {Array.from({ length: field_count }, (_, index) => (
            <div key={index}>
              <div className="mb-2 h-4 w-24 rounded-md bg-gray-100 dark:bg-white/5" />
              <div className="h-11 w-full rounded-lg bg-gray-100 dark:bg-white/5" />
            </div>
          ))}
          <div className="h-11 w-full rounded-lg bg-brand-100 dark:bg-brand-500/20" />
        </div>
      </div>
    </div>
  );
}
