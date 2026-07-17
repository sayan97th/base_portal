"use client";

interface IntakeDeleteRowButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

/** Trash icon shown on row hover, shared by every intake table. */
export default function IntakeDeleteRowButton({ onClick, disabled = false }: IntakeDeleteRowButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Delete row"
      disabled={disabled}
      className="flex h-full w-full items-center justify-center opacity-0 transition-all group-hover:opacity-100 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-0 dark:hover:text-red-400"
    >
      <svg
        className="h-3.5 w-3.5 text-gray-300 transition-colors group-hover:text-red-400 dark:text-gray-600 dark:group-hover:text-red-500"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
