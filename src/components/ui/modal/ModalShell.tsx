"use client";

import { useEffect, useCallback } from "react";

interface ModalShellProps {
  is_open: boolean;
  max_width?: string;
  on_close: () => void;
  children: React.ReactNode;
}

/**
 * A reusable modal wrapper that handles:
 * - Body scroll lock when open
 * - ESC key to close
 * - Backdrop click to close
 * - Full-height scroll when content overflows the viewport
 */
export default function ModalShell({
  is_open,
  max_width = "max-w-xl",
  on_close,
  children,
}: ModalShellProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") on_close();
    },
    [on_close]
  );

  useEffect(() => {
    if (!is_open) return;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [is_open, handleKeyDown]);

  if (!is_open) return null;

  return (
    /* Outer fixed container — clips to viewport */
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={on_close}
      />

      {/* Scrollable inner layer — lets tall modals scroll within the overlay */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          {/* Modal card */}
          <div
            className={`relative w-full ${max_width} rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900`}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
