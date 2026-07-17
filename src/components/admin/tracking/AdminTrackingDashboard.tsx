"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import type { TrackingOrderSummary, OrderStatus } from "@/types/admin";
import type { AdminOrderProductType } from "@/types/admin";
import { listTrackingOrders, updateOrderStatus } from "@/services/admin/order-tracking.service";

// ─── Constants ─────────────────────────────────────────────────────────────────

const PER_PAGE = 50;

type ProductFilterKey = AdminOrderProductType | "all";
type StatusFilterKey = OrderStatus | "needs_update" | "all";
type SortKey = "created_at" | "last_update_at" | "status" | "product_type" | "updates_count";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRelativeTime(iso: string): string {
  const diff_ms = Date.now() - new Date(iso).getTime();
  const diff_min = Math.floor(diff_ms / 60_000);
  if (diff_min < 1) return "just now";
  if (diff_min < 60) return `${diff_min}m ago`;
  const diff_h = Math.floor(diff_min / 60);
  if (diff_h < 24) return `${diff_h}h ago`;
  const diff_d = Math.floor(diff_h / 24);
  if (diff_d === 1) return "yesterday";
  if (diff_d < 7) return `${diff_d}d ago`;
  return formatShortDate(iso);
}

// ─── Product type config ───────────────────────────────────────────────────────

const PRODUCT_TYPE_CFG: Record<AdminOrderProductType, { label: string; badge: string; dot: string; full_view_url: (id: string) => string }> = {
  link_building: {
    label: "Link Building",
    badge: "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-500/20",
    dot: "bg-brand-500",
    full_view_url: (id) => `/admin/orders/${id}/tracking`,
  },
  new_content: {
    label: "New Content",
    badge: "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:ring-purple-500/20",
    dot: "bg-purple-500",
    full_view_url: (id) => `/admin/new-content/orders/${id}`,
  },
  content_optimization: {
    label: "Content Refresh",
    badge: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:ring-teal-500/20",
    dot: "bg-teal-500",
    full_view_url: (id) => `/admin/content-optimization/orders/${id}`,
  },
  content_brief: {
    label: "SME Content",
    badge: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:ring-orange-500/20",
    dot: "bg-orange-500",
    full_view_url: (id) => `/admin/content-briefs/orders/${id}`,
  },
  content_refresh: {
    label: "Content Refresh",
    badge: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:ring-teal-500/20",
    dot: "bg-teal-500",
    full_view_url: (id) => `/admin/content-refresh/orders/${id}`,
  },
};

const PRODUCT_TABS: { key: ProductFilterKey; label: string }[] = [
  { key: "all",                  label: "All Products" },
  { key: "link_building",        label: "Link Building" },
  { key: "new_content",          label: "New Content" },
  { key: "content_optimization", label: "Content Refresh" },
  { key: "content_brief",        label: "SME Content" },
];

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<OrderStatus, { label: string; dot: string; badge: string }> = {
  new_request: {
    label: "New Request",
    dot: "bg-teal-500",
    badge: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:ring-teal-500/20",
  },
  pending: {
    label: "New Request",
    dot: "bg-teal-500",
    badge: "bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:ring-teal-500/20",
  },
  processing: {
    label: "Processing",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20",
  },
  completed: {
    label: "Completed",
    dot: "bg-success-500",
    badge: "bg-success-50 text-success-700 ring-success-200 dark:bg-success-500/10 dark:text-success-400 dark:ring-success-500/20",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-error-500",
    badge: "bg-error-50 text-error-700 ring-error-200 dark:bg-error-500/10 dark:text-error-400 dark:ring-error-500/20",
  },
  payment_pending: {
    label: "Payment Pending",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  },
  pending_details: {
    label: "Pending Details",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20",
  },
};

const ALL_STATUSES: OrderStatus[] = ["new_request", "pending", "processing", "completed", "cancelled", "payment_pending"];

const STATUS_FILTER_OPTIONS: { key: StatusFilterKey; label: string }[] = [
  { key: "all",             label: "All Statuses" },
  { key: "needs_update",    label: "Needs Update" },
  { key: "new_request",     label: "New Request" },
  { key: "processing",      label: "Processing" },
  { key: "completed",       label: "Completed" },
  { key: "cancelled",       label: "Cancelled" },
  { key: "payment_pending", label: "Payment Pending" },
];

// ─── Icons ─────────────────────────────────────────────────────────────────────

const RefreshIcon = ({ spinning }: { spinning?: boolean }) => (
  <svg className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const ChevronUpDownIcon = () => (
  <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
  </svg>
);

const SortIcon = ({ dir }: { dir?: "asc" | "desc" | null }) => (
  <svg className={`ml-1 inline h-3 w-3 ${dir ? "opacity-80" : "opacity-30"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
    {dir === "asc"
      ? <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      : dir === "desc"
      ? <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      : <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15M8.25 9L12 5.25l3.75 3.75" />}
  </svg>
);

const AlertIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const EmptyIcon = () => (
  <svg className="h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.235 2.235 0 00-.1.661z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

// ─── Skeleton ──────────────────────────────────────────────────────────────────

const Sk = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded bg-gray-100 dark:bg-gray-800 ${className ?? ""}`} />
);

// ─── Status Change Dialog ──────────────────────────────────────────────────────

interface StatusChangeDialogProps {
  is_open: boolean;
  order_title: string;
  current_status: OrderStatus;
  new_status: OrderStatus;
  is_loading: boolean;
  onConfirm: (notify_user: boolean) => void;
  onCancel: () => void;
}

const StatusChangeDialog: React.FC<StatusChangeDialogProps> = ({
  is_open, order_title, current_status, new_status, is_loading, onConfirm, onCancel,
}) => {
  const [notify_user, setNotifyUser] = useState(false);

  useEffect(() => {
    if (is_open) setNotifyUser(false);
  }, [is_open]);

  if (!is_open) return null;

  const from_cfg = STATUS_CFG[current_status];
  const to_cfg   = STATUS_CFG[new_status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!is_loading ? onCancel : undefined} />
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400">
          <AlertIcon />
        </div>
        <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-white">Change order status</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          You are about to change the status of{" "}
          <span className="font-semibold text-gray-700 dark:text-gray-200">{order_title || "this order"}</span>.
        </p>
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${from_cfg.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${from_cfg.dot}`} />{from_cfg.label}
          </span>
          <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${to_cfg.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${to_cfg.dot}`} />{to_cfg.label}
          </span>
        </div>
        <label className="mb-5 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={notify_user}
            onChange={(e) => setNotifyUser(e.target.checked)}
            disabled={is_loading}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:opacity-60"
          />
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Notify client of this change</span>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              An email will be sent to the client informing them of the status change.
            </p>
          </div>
        </label>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={is_loading} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button onClick={() => onConfirm(notify_user)} disabled={is_loading} className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition hover:bg-brand-600 disabled:opacity-60">
            {is_loading ? (
              <span className="flex items-center justify-center gap-1.5">
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Updating…
              </span>
            ) : "Confirm change"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Status Cell with Quick-Change Popover ─────────────────────────────────────

interface StatusCellProps {
  order: TrackingOrderSummary;
  onRequestChange: (order: TrackingOrderSummary, new_status: OrderStatus) => void;
}

const StatusCell: React.FC<StatusCellProps> = ({ order, onRequestChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CFG[order.status];

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 transition hover:brightness-95 ${cfg.badge}`}
        title="Click to change status"
      >
        {order.status === "processing" ? (
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
          </span>
        ) : (order.status === "new_request" || order.status === "pending") ? (
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal-500" />
          </span>
        ) : (
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        )}
        {cfg.label}
        <ChevronUpDownIcon />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Change status to
          </p>
          {ALL_STATUSES.map((s) => {
            const c = STATUS_CFG[s];
            const is_current = s === order.status;
            return (
              <button
                key={s}
                disabled={is_current}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onRequestChange(order, s);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition ${
                  is_current
                    ? "cursor-default opacity-40"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                <span className="text-gray-700 dark:text-gray-200">{c.label}</span>
                {is_current && <span className="ml-auto text-[10px] text-gray-400">current</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  current_page: number;
  total_pages: number;
  total_items: number;
  per_page: number;
  onChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ current_page, total_pages, total_items, per_page, onChange }) => {
  if (total_pages <= 1) return null;
  const from = (current_page - 1) * per_page + 1;
  const to   = Math.min(current_page * per_page, total_items);

  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {from}–{to} of {total_items} orders
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(current_page - 1)}
          disabled={current_page === 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
        </button>
        <span className="min-w-16 text-center text-xs font-medium text-gray-600 dark:text-gray-300">
          {current_page} / {total_pages}
        </span>
        <button
          onClick={() => onChange(current_page + 1)}
          disabled={current_page === total_pages}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <ChevronRightIcon />
        </button>
      </div>
    </div>
  );
};

// ─── Main dashboard ───────────────────────────────────────────────────────────

interface DialogState {
  order: TrackingOrderSummary;
  new_status: OrderStatus;
  is_loading: boolean;
}

const AdminTrackingDashboard: React.FC = () => {
  const [orders, setOrders]           = useState<TrackingOrderSummary[]>([]);
  const [is_loading, setIsLoading]    = useState(true);
  const [load_error, setLoadError]    = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [product_tab, setProductTab]  = useState<ProductFilterKey>("all");
  const [status_filter, setStatusFilter] = useState<StatusFilterKey>("all");
  const [sort_key, setSortKey]        = useState<SortKey>("created_at");
  const [sort_dir, setSortDir]        = useState<"asc" | "desc">("desc");
  const [current_page, setCurrentPage] = useState(1);
  const [dialog, setDialog]           = useState<DialogState | null>(null);
  const [toast, setToast]             = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const product_type = product_tab === "all" ? undefined : product_tab as AdminOrderProductType;
      const res = await listTrackingOrders({ product_type });
      setOrders(res.data);
    } catch {
      setLoadError("Failed to load orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [product_tab]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Derived filtered + sorted list ─────────────────────────────────────────

  const filtered_orders = useMemo(() => {
    let list = orders;

    if (status_filter === "needs_update") {
      list = list.filter((o) => o.updates_count === 0);
    } else if (status_filter !== "all") {
      list = list.filter((o) => o.status === status_filter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((o) =>
        (o.order_title ?? "").toLowerCase().includes(q) ||
        o.user.first_name.toLowerCase().includes(q) ||
        o.user.last_name.toLowerCase().includes(q) ||
        o.user.email.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sort_key === "created_at") {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sort_key === "last_update_at") {
        const ta = a.last_update_at ? new Date(a.last_update_at).getTime() : 0;
        const tb = b.last_update_at ? new Date(b.last_update_at).getTime() : 0;
        cmp = ta - tb;
      } else if (sort_key === "status") {
        cmp = a.status.localeCompare(b.status);
      } else if (sort_key === "product_type") {
        cmp = a.product_type.localeCompare(b.product_type);
      } else if (sort_key === "updates_count") {
        cmp = a.updates_count - b.updates_count;
      }
      return sort_dir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [orders, status_filter, search, sort_key, sort_dir]);

  const total_pages      = Math.ceil(filtered_orders.length / PER_PAGE);
  const paginated_orders = filtered_orders.slice((current_page - 1) * PER_PAGE, current_page * PER_PAGE);

  // ── Sorting ─────────────────────────────────────────────────────────────────

  function toggleSort(key: SortKey) {
    if (sort_key === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setCurrentPage(1);
  }

  function sortDirFor(key: SortKey): "asc" | "desc" | null {
    return sort_key === key ? sort_dir : null;
  }

  // ── Tab switching ────────────────────────────────────────────────────────────

  function switchProductTab(tab: ProductFilterKey) {
    setProductTab(tab);
    setCurrentPage(1);
  }

  function switchStatusFilter(val: StatusFilterKey) {
    setStatusFilter(val);
    setCurrentPage(1);
  }

  // ── Status change ────────────────────────────────────────────────────────────

  function handleRequestStatusChange(order: TrackingOrderSummary, new_status: OrderStatus) {
    setDialog({ order, new_status, is_loading: false });
  }

  async function handleConfirmStatusChange(notify_user: boolean) {
    if (!dialog) return;
    setDialog((d) => d ? { ...d, is_loading: true } : null);
    try {
      await updateOrderStatus(dialog.order.id, dialog.new_status, notify_user);
      setOrders((prev) =>
        prev.map((o) => o.id === dialog.order.id ? { ...o, status: dialog.new_status } : o)
      );
      showToast(
        notify_user
          ? `Status changed to ${STATUS_CFG[dialog.new_status].label} — client notified.`
          : `Status changed to ${STATUS_CFG[dialog.new_status].label}.`
      );
      setDialog(null);
    } catch {
      setDialog((d) => d ? { ...d, is_loading: false } : null);
    }
  }

  // ── Needs-update count ───────────────────────────────────────────────────────

  const needs_update_count = orders.filter((o) => o.updates_count === 0 && (o.status === "new_request" || o.status === "pending" || o.status === "processing")).length;

  return (
    <>
      {dialog && (
        <StatusChangeDialog
          is_open
          order_title={dialog.order.order_title ?? PRODUCT_TYPE_CFG[dialog.order.product_type].label + " Order"}
          current_status={dialog.order.status}
          new_status={dialog.new_status}
          is_loading={dialog.is_loading}
          onConfirm={handleConfirmStatusChange}
          onCancel={() => setDialog(null)}
        />
      )}

      <div className="flex h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

        {/* ── Top bar ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-md shadow-brand-500/30">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white">Order Tracking</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {is_loading
                  ? "Loading orders…"
                  : `${filtered_orders.length} order${filtered_orders.length !== 1 ? "s" : ""}${search ? " matching search" : ""}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search orders or clients…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="h-8 rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 text-xs outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500"
                style={{ width: 220 }}
              />
            </div>

            {/* Status filter */}
            <select
              value={status_filter}
              onChange={(e) => switchStatusFilter(e.target.value as StatusFilterKey)}
              className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2 text-xs outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>

            {/* Refresh */}
            <button
              onClick={() => { void loadOrders(); }}
              disabled={is_loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              title="Refresh"
            >
              <RefreshIcon spinning={is_loading} />
            </button>
          </div>
        </div>

        {/* ── Product type tabs ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-0 overflow-x-auto border-b border-gray-100 bg-gray-50/50 px-4 dark:border-gray-800 dark:bg-gray-900/50">
          {PRODUCT_TABS.map((tab) => {
            const is_active = product_tab === tab.key;
            const product_cfg = tab.key !== "all" ? PRODUCT_TYPE_CFG[tab.key as AdminOrderProductType] : null;
            return (
              <button
                key={tab.key}
                onClick={() => switchProductTab(tab.key)}
                className={`relative flex shrink-0 items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium transition-colors ${
                  is_active
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {is_active && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-500" />}
                {product_cfg && <span className={`h-2 w-2 rounded-full ${product_cfg.dot}`} />}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Toast ───────────────────────────────────────────────────────────── */}
        {toast && (
          <div className="flex items-center gap-2 border-b border-success-200 bg-success-50 px-5 py-2 text-xs font-medium text-success-700 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {toast}
          </div>
        )}

        {/* ── Needs-update alert banner ────────────────────────────────────────── */}
        {!is_loading && needs_update_count > 0 && status_filter !== "needs_update" && (
          <div className="flex items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-5 py-2 dark:border-red-500/20 dark:bg-red-500/[0.06]">
            <div className="flex items-center gap-2 text-xs font-medium text-red-700 dark:text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              {needs_update_count} order{needs_update_count !== 1 ? "s" : ""} without any updates yet
            </div>
            <button
              onClick={() => switchStatusFilter("needs_update")}
              className="text-xs font-semibold text-red-600 underline-offset-2 hover:underline dark:text-red-400"
            >
              View them
            </button>
          </div>
        )}

        {/* ── Table area ──────────────────────────────────────────────────────── */}
        {load_error ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="text-center">
              <p className="text-sm text-error-600 dark:text-error-400">{load_error}</p>
              <button onClick={() => { void loadOrders(); }} className="mt-2 text-sm font-medium text-brand-500 underline hover:text-brand-600">
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  {/* Group header row */}
                  <tr>
                    <th className="border-b border-r border-gray-200 bg-gray-100 px-3 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400" colSpan={4}>
                      Order Details
                    </th>
                    <th className="border-b border-r border-purple-200 bg-purple-50 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-400" colSpan={2}>
                      Status &amp; Updates
                    </th>
                    <th className="border-b border-r border-amber-200 bg-amber-50 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-400" colSpan={2}>
                      Dates
                    </th>
                    <th className="border-b border-gray-200 bg-gray-100 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                  {/* Column headers */}
                  <tr className="bg-white dark:bg-gray-900">
                    <th className="border-b border-r border-gray-100 px-3 py-2 text-left font-semibold text-gray-600 dark:border-gray-800 dark:text-gray-300" style={{ minWidth: 40 }}>
                      #
                    </th>
                    <th
                      className="cursor-pointer border-b border-r border-gray-100 px-3 py-2 text-left font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/50"
                      style={{ minWidth: 130 }}
                      onClick={() => toggleSort("product_type")}
                    >
                      Product<SortIcon dir={sortDirFor("product_type")} />
                    </th>
                    <th className="border-b border-r border-gray-100 px-3 py-2 text-left font-semibold text-gray-600 dark:border-gray-800 dark:text-gray-300" style={{ minWidth: 220 }}>
                      Order Title
                    </th>
                    <th className="border-b border-r border-gray-100 px-3 py-2 text-left font-semibold text-gray-600 dark:border-gray-800 dark:text-gray-300" style={{ minWidth: 160 }}>
                      Client
                    </th>
                    <th
                      className="cursor-pointer border-b border-r border-gray-100 px-3 py-2 text-left font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/50"
                      style={{ minWidth: 150 }}
                      onClick={() => toggleSort("status")}
                    >
                      Status<SortIcon dir={sortDirFor("status")} />
                    </th>
                    <th
                      className="cursor-pointer border-b border-r border-gray-100 px-3 py-2 text-center font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/50"
                      style={{ minWidth: 90 }}
                      onClick={() => toggleSort("updates_count")}
                    >
                      Updates<SortIcon dir={sortDirFor("updates_count")} />
                    </th>
                    <th
                      className="cursor-pointer border-b border-r border-gray-100 px-3 py-2 text-left font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/50"
                      style={{ minWidth: 110 }}
                      onClick={() => toggleSort("last_update_at")}
                    >
                      Last Activity<SortIcon dir={sortDirFor("last_update_at")} />
                    </th>
                    <th
                      className="cursor-pointer border-b border-r border-gray-100 px-3 py-2 text-left font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/50"
                      style={{ minWidth: 100 }}
                      onClick={() => toggleSort("created_at")}
                    >
                      Created<SortIcon dir={sortDirFor("created_at")} />
                    </th>
                    <th className="border-b border-gray-100 px-3 py-2 text-center font-semibold text-gray-600 dark:border-gray-800 dark:text-gray-300" style={{ minWidth: 80 }}>
                      View
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {is_loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        {[40, 130, 220, 160, 150, 90, 110, 100, 80].map((w, j) => (
                          <td key={j} className="px-3 py-2.5" style={{ minWidth: w }}>
                            <Sk className="h-3.5 w-full rounded" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : paginated_orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <EmptyIcon />
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No orders found</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {search ? "Try adjusting your search or filters." : "No orders match the current filter."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated_orders.map((order, idx) => {
                      const product_cfg = PRODUCT_TYPE_CFG[order.product_type];
                      const needs_update = order.updates_count === 0;
                      const global_idx = (current_page - 1) * PER_PAGE + idx + 1;

                      return (
                        <tr
                          key={order.id}
                          className={`group transition-colors ${
                            needs_update
                              ? "bg-red-50/30 hover:bg-red-50/60 dark:bg-red-500/[0.03] dark:hover:bg-red-500/[0.06]"
                              : "hover:bg-gray-50/80 dark:hover:bg-white/[0.02]"
                          }`}
                        >
                          {/* Row number */}
                          <td className="border-r border-gray-50 px-3 py-2.5 text-gray-400 dark:border-gray-800 dark:text-gray-600">
                            {global_idx}
                          </td>

                          {/* Product type */}
                          <td className="border-r border-gray-50 px-3 py-2.5 dark:border-gray-800">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${product_cfg.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${product_cfg.dot}`} />
                              {product_cfg.label}
                            </span>
                          </td>

                          {/* Order title */}
                          <td className="border-r border-gray-50 px-3 py-2.5 dark:border-gray-800">
                            <span
                              className="block max-w-[240px] truncate font-medium text-gray-800 dark:text-gray-100"
                              title={order.order_title ?? ""}
                            >
                              {order.order_title || <span className="italic text-gray-400">{product_cfg.label} Order</span>}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                              #{order.id.slice(0, 8).toUpperCase()} · {order.items_count} item{order.items_count !== 1 ? "s" : ""} · {formatCurrency(order.total_amount)}
                            </span>
                          </td>

                          {/* Client */}
                          <td className="border-r border-gray-50 px-3 py-2.5 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                {order.user.first_name[0]}{order.user.last_name[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-700 dark:text-gray-200">
                                  {order.user.first_name} {order.user.last_name}
                                </p>
                                <p className="truncate text-[10px] text-gray-400 dark:text-gray-500 max-w-[130px]">
                                  {order.user.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Status — quick change */}
                          <td className="border-r border-gray-50 px-3 py-2.5 dark:border-gray-800">
                            <StatusCell order={order} onRequestChange={handleRequestStatusChange} />
                          </td>

                          {/* Updates count */}
                          <td className="border-r border-gray-50 px-3 py-2.5 text-center dark:border-gray-800">
                            {needs_update ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                                None
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                {order.updates_count}
                              </span>
                            )}
                          </td>

                          {/* Last activity */}
                          <td className="border-r border-gray-50 px-3 py-2.5 dark:border-gray-800">
                            {order.last_update_at ? (
                              <span className="text-gray-600 dark:text-gray-400" title={new Date(order.last_update_at).toLocaleString()}>
                                {formatRelativeTime(order.last_update_at)}
                              </span>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-600">—</span>
                            )}
                          </td>

                          {/* Created */}
                          <td className="border-r border-gray-50 px-3 py-2.5 dark:border-gray-800">
                            <span className="text-gray-600 dark:text-gray-400">
                              {formatShortDate(order.created_at)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-2.5 text-center">
                            <Link
                              href={`/admin/tracking/${order.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/40"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!is_loading && (
              <Pagination
                current_page={current_page}
                total_pages={total_pages}
                total_items={filtered_orders.length}
                per_page={PER_PAGE}
                onChange={setCurrentPage}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminTrackingDashboard;
