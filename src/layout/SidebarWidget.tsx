import React from "react";

export default function SidebarWidget() {
  return (
    <div className="mx-auto mb-10 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]">
      <div className="mb-3 flex items-center justify-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-100 dark:bg-coral-500/20">
          <svg
            className="fill-coral-500"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10 1.25C5.16751 1.25 1.25 5.16751 1.25 10C1.25 14.8325 5.16751 18.75 10 18.75C14.8325 18.75 18.75 14.8325 18.75 10C18.75 5.16751 14.8325 1.25 10 1.25ZM9.375 6.25C9.375 5.90482 9.65482 5.625 10 5.625C10.3452 5.625 10.625 5.90482 10.625 6.25V10.625C10.625 10.9702 10.3452 11.25 10 11.25C9.65482 11.25 9.375 10.9702 9.375 10.625V6.25ZM10 14.375C10.3452 14.375 10.625 14.0952 10.625 13.75C10.625 13.4048 10.3452 13.125 10 13.125C9.65482 13.125 9.375 13.4048 9.375 13.75C9.375 14.0952 9.65482 14.375 10 14.375Z"
              fill=""
            />
          </svg>
        </span>
      </div>
      <h3 className="mb-1 font-semibold text-gray-900 dark:text-white">
        Need help?
      </h3>
      <p className="mb-4 text-gray-500 text-theme-sm dark:text-gray-400">
        Let&apos;s talk
      </p>
      <a
        href="#"
        className="flex items-center justify-center p-3 font-medium text-white rounded-lg bg-coral-500 text-theme-sm hover:bg-coral-600 uppercase tracking-wide"
      >
        Schedule a Call
      </a>
    </div>
  );
}
