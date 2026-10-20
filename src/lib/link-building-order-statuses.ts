/**
 * Preset Status values of the admin Link Building Orders table and the colors
 * each one is drawn with. Shared by the Status cell pill and the status filter
 * bar so a status always reads the same color wherever it shows up.
 */

export const LINK_BUILDING_ORDER_STATUSES = [
  "New Request",
  "Reviewing",
  "Ordered",
  "Pending",
  "Live",
  "Quality Control",
  "Cancelled",
  "Partnership Check",
  "Approved",
  "Not Approved",
  "Ready",
  "Rejected",
  "Scheduled",
];

/** Background and text classes of the Status pill shown inside a cell. */
export const STATUS_BADGE_CLASSES: Record<string, string> = {
  "New Request": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Reviewing: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  Ordered: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Live: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Quality Control": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  Cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "Partnership Check": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Not Approved": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Ready: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  Rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  Scheduled: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

/** Solid dot color of each status, used as a compact legend in the filter bar. */
export const STATUS_DOT_CLASSES: Record<string, string> = {
  "New Request": "bg-blue-500",
  Reviewing: "bg-indigo-500",
  Ordered: "bg-orange-500",
  Pending: "bg-yellow-400",
  Live: "bg-green-500",
  "Quality Control": "bg-teal-500",
  Cancelled: "bg-red-500",
  "Partnership Check": "bg-amber-500",
  Approved: "bg-emerald-500",
  "Not Approved": "bg-red-400",
  Ready: "bg-sky-500",
  Rejected: "bg-rose-500",
  Scheduled: "bg-purple-500",
};

export const DEFAULT_STATUS_BADGE_CLASS = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
export const DEFAULT_STATUS_DOT_CLASS = "bg-gray-400";
