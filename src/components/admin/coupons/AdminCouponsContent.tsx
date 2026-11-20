"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Coupon } from "@/types/admin/coupons";
import {
  listAdminCoupons,
  toggleAdminCouponStatus,
  deleteAdminCoupon,
} from "@/services/admin/coupons.service";
import CouponsBoard from "./list/CouponsBoard";
import styles from "./list/CouponsBoard.module.scss";
import {
  SORT_OPTIONS,
  STATUS_META,
  STATUS_ORDER,
  getCouponStatus,
  groupCouponsByStatus,
  matchesSearch,
  sortCoupons,
  type CouponSort,
  type CouponStatus,
  type StatusFilter,
} from "./list/coupon-list";
import {
  CloseIcon,
  GiftIcon,
  PlusIcon,
  SearchIcon,
  TicketIcon,
  WarningIcon,
} from "./list/CouponIcons";

// ── Delete confirmation modal ────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  coupon: Coupon;
  is_deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ coupon, is_deleting, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <WarningIcon width={24} height={24} />
        </div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Delete coupon</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Are you sure you want to delete{" "}
          <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{coupon.code}</span>?
          This action cannot be undone.
        </p>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={is_deleting}
            className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={is_deleting}
            className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {is_deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  type: "success" | "error";
  onDismiss: () => void;
}

function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    const timeout_id = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timeout_id);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className={`fixed bottom-6 left-4 right-4 z-[100] flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg sm:left-auto sm:right-6 ${
        type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      {message}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

const ALL_TILE_COLOR = "var(--color-brand-500)";

export default function AdminCouponsContent() {
  const router = useRouter();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search_query, setSearchQuery] = useState("");
  const [status_filter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<CouponSort>("newest");
  const [collapsed_keys, setCollapsedKeys] = useState<Set<CouponStatus>>(new Set());

  const [open_picker_id, setOpenPickerId] = useState<string | null>(null);
  const [updating_ids, setUpdatingIds] = useState<Set<string>>(new Set());
  const [delete_coupon, setDeleteCoupon] = useState<Coupon | null>(null);
  const [is_deleting, setIsDeleting] = useState(false);
  const [copied_code, setCopiedCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  // State updates only happen in the promise callbacks, so the initial
  // fetch inside the effect does not trigger a synchronous re-render.
  const fetchCoupons = useCallback((isCancelled: () => boolean = () => false) => {
    return listAdminCoupons()
      .then((fetched_coupons) => {
        if (isCancelled()) return;
        setCoupons(fetched_coupons);
        setError(null);
      })
      .catch(() => {
        if (isCancelled()) return;
        setError("Failed to load coupons. Please try again.");
      })
      .finally(() => {
        if (!isCancelled()) setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    let is_cancelled = false;
    fetchCoupons(() => is_cancelled);
    return () => {
      is_cancelled = true;
    };
  }, [fetchCoupons]);

  const loadData = useCallback(() => {
    setIsLoading(true);
    setError(null);
    fetchCoupons();
  }, [fetchCoupons]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const status_counts = useMemo(() => {
    const now = new Date();
    const counts: Record<CouponStatus, number> = { active: 0, scheduled: 0, expired: 0, disabled: 0 };
    coupons.forEach((coupon) => {
      counts[getCouponStatus(coupon, now)] += 1;
    });
    return counts;
  }, [coupons]);

  const awaiting_gift_cards = useMemo(
    () => coupons.reduce((total, coupon) => total + (coupon.gift_card_claims_awaiting_count ?? 0), 0),
    [coupons]
  );

  const visible_coupons = useMemo(() => {
    const now = new Date();
    const filtered = coupons.filter(
      (coupon) =>
        (status_filter === "all" || getCouponStatus(coupon, now) === status_filter) &&
        matchesSearch(coupon, search_query)
    );
    return sortCoupons(filtered, sort);
  }, [coupons, status_filter, search_query, sort]);

  const groups = useMemo(() => groupCouponsByStatus(visible_coupons), [visible_coupons]);

  const has_filters = status_filter !== "all" || search_query.trim() !== "";

  const summary_tiles = [
    { key: "all" as StatusFilter, label: "All", color: ALL_TILE_COLOR, count: coupons.length },
    ...STATUS_ORDER.map((key) => ({
      key: key as StatusFilter,
      label: STATUS_META[key].label,
      color: STATUS_META[key].color,
      count: status_counts[key],
    })),
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCopyCode = useCallback((code: string) => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      })
      .catch(() => showToast("Could not copy the code.", "error"));
  }, [showToast]);

  const handleToggleGroup = useCallback((key: CouponStatus) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSelectTile = (key: StatusFilter) => {
    setStatusFilter((prev) => (prev === key && key !== "all" ? "all" : key));
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setSearchQuery("");
  };

  const handleSetActive = useCallback(
    async (coupon: Coupon, is_active: boolean) => {
      const setCouponActive = (value: boolean) =>
        setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, is_active: value } : c)));
      const setUpdating = (value: boolean) =>
        setUpdatingIds((prev) => {
          const next = new Set(prev);
          if (value) next.add(coupon.id);
          else next.delete(coupon.id);
          return next;
        });

      setCouponActive(is_active);
      setUpdating(true);
      try {
        await toggleAdminCouponStatus(coupon.id, is_active);
        showToast(is_active ? `${coupon.code} enabled.` : `${coupon.code} disabled.`, "success");
      } catch {
        setCouponActive(!is_active);
        showToast("Failed to update status.", "error");
      } finally {
        setUpdating(false);
      }
    },
    [showToast]
  );

  const handleDeleteConfirm = async () => {
    if (!delete_coupon) return;
    setIsDeleting(true);
    try {
      await deleteAdminCoupon(delete_coupon.id);
      setCoupons((prev) => prev.filter((c) => c.id !== delete_coupon.id));
      showToast("Coupon deleted.", "success");
      setDeleteCoupon(null);
    } catch {
      showToast("Failed to delete coupon.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenCreate = () => router.push("/admin/coupons/new");

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderContent = () => {
    if (is_loading) {
      return (
        <div aria-busy="true" aria-label="Loading coupons">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className={styles.skeletonRow} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <WarningIcon />
          </div>
          <p className={`${styles.emptyText} ${styles.emptyError}`}>{error}</p>
          <button type="button" className={`${styles.primaryButton} ${styles.emptyAction}`} onClick={loadData}>
            Retry
          </button>
        </div>
      );
    }

    if (groups.length === 0) {
      return (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <TicketIcon />
          </div>
          <h3 className={styles.emptyTitle}>{has_filters ? "No coupons match" : "No coupons yet"}</h3>
          <p className={styles.emptyText}>
            {has_filters
              ? "Try another search or clear the filters."
              : "Create your first coupon to get started."}
          </p>
          {has_filters ? (
            <button type="button" className={`${styles.linkButton} ${styles.emptyAction}`} onClick={handleClearFilters}>
              Clear filters
            </button>
          ) : (
            <button type="button" className={`${styles.primaryButton} ${styles.emptyAction}`} onClick={handleOpenCreate}>
              <PlusIcon />
              Create coupon
            </button>
          )}
        </div>
      );
    }

    return (
      <CouponsBoard
        groups={groups}
        collapsed_keys={collapsed_keys}
        copied_code={copied_code}
        open_picker_id={open_picker_id}
        updating_ids={updating_ids}
        onToggleGroup={handleToggleGroup}
        onCopyCode={handleCopyCode}
        onTogglePicker={setOpenPickerId}
        onSetActive={handleSetActive}
        onDelete={setDeleteCoupon}
      />
    );
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Coupons</h1>
          <p className={styles.subtitle}>Create, track and manage discount codes.</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={handleOpenCreate}>
          <PlusIcon />
          Create coupon
        </button>
      </div>

      {/* Summary tiles, also used as the status filter */}
      <div className={styles.summary} role="group" aria-label="Filter by status">
        {summary_tiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            className={`${styles.tile} ${status_filter === tile.key ? styles.tileActive : ""}`}
            style={{ "--tile-color": tile.color } as React.CSSProperties}
            onClick={() => handleSelectTile(tile.key)}
            aria-pressed={status_filter === tile.key}
          >
            <span className={styles.tileLabel}>
              <span className={styles.tileDot} />
              {tile.label}
            </span>
            <span className={styles.tileValue}>{is_loading ? "..." : tile.count}</span>
          </button>
        ))}
      </div>

      {/* Gift card reminder */}
      {awaiting_gift_cards > 0 && (
        <div className={styles.notice}>
          <GiftIcon />
          <span>
            <strong>
              {awaiting_gift_cards} gift card{awaiting_gift_cards === 1 ? "" : "s"}
            </strong>{" "}
            waiting to be sent. Open the coupon to review the requests.
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <span className="sr-only">Search coupons</span>
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by code or name"
            value={search_query}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {search_query && (
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <CloseIcon />
            </button>
          )}
        </label>

        <div className={styles.toolbarEnd}>
          {!is_loading && (
            <span className={styles.resultCount}>
              {visible_coupons.length} of {coupons.length}
            </span>
          )}
          <select
            className={styles.select}
            value={sort}
            onChange={(event) => setSort(event.target.value as CouponSort)}
            aria-label="Sort coupons"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {renderContent()}

      {delete_coupon && (
        <DeleteConfirmModal
          coupon={delete_coupon}
          is_deleting={is_deleting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteCoupon(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={dismissToast} />}
    </div>
  );
}
