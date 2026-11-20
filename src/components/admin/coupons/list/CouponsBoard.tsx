"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import type { Coupon } from "@/types/admin/coupons";
import styles from "./CouponsBoard.module.scss";
import {
  STATUS_META,
  daysUntil,
  formatDiscount,
  formatShortDate,
  getAppliesToLabel,
  getAppliesToTitle,
  getCouponStatus,
  getDiscountTypeLabel,
  getUsagePercent,
  type CouponGroup,
  type CouponStatus,
} from "./coupon-list";
import {
  ChartIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  EditIcon,
  GiftIcon,
  TrashIcon,
} from "./CouponIcons";

// ── Status picker ────────────────────────────────────────────────────────────

interface StatusPickerProps {
  coupon: Coupon;
  onSelect: (is_active: boolean) => void;
  onClose: () => void;
}

const PICKER_OPTIONS = [
  {
    is_active: true,
    label: "Enabled",
    hint: "Clients can use it within its dates",
    color: STATUS_META.active.color,
  },
  {
    is_active: false,
    label: "Disabled",
    hint: "Paused, clients cannot use it",
    color: STATUS_META.disabled.color,
  },
];

function StatusPicker({ coupon, onSelect, onClose }: StatusPickerProps) {
  const picker_ref = useRef<HTMLDivElement>(null);
  const on_close_ref = useRef(onClose);

  useEffect(() => {
    on_close_ref.current = onClose;
  }, [onClose]);

  // Close on outside click or Escape. Listeners are attached once per opening.
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const parent = picker_ref.current?.parentElement;
      if (parent && !parent.contains(event.target as Node)) on_close_ref.current();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") on_close_ref.current();
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    picker_ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div ref={picker_ref} className={styles.picker} role="menu" aria-label={`Status for ${coupon.code}`}>
      {PICKER_OPTIONS.map((option) => (
        <button
          key={option.label}
          type="button"
          role="menuitemradio"
          aria-checked={coupon.is_active === option.is_active}
          className={styles.pickerOption}
          onClick={() => onSelect(option.is_active)}
        >
          <span className={styles.pickerSwatch} style={{ background: option.color }} />
          <span className={styles.pickerText}>
            <span className={styles.pickerLabel}>{option.label}</span>
            <span className={styles.pickerHint}>{option.hint}</span>
          </span>
          {coupon.is_active === option.is_active && <CheckIcon className={styles.pickerCheck} />}
        </button>
      ))}
    </div>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

interface CouponRowProps {
  coupon: Coupon;
  status: CouponStatus;
  is_copied: boolean;
  is_picker_open: boolean;
  is_updating: boolean;
  onCopyCode: (code: string) => void;
  onTogglePicker: (coupon_id: string | null) => void;
  onSetActive: (coupon: Coupon, is_active: boolean) => void;
  onDelete: (coupon: Coupon) => void;
}

function getExpiryHint(coupon: Coupon, status: CouponStatus): { text: string; class_name: string } | null {
  if (status === "scheduled" && coupon.starts_at) {
    return { text: `Starts ${formatShortDate(coupon.starts_at)}`, class_name: styles.dateNear };
  }
  if (status !== "active") return null;
  const days_left = daysUntil(coupon.expires_at);
  if (days_left === null) return null;
  if (days_left <= 1) return { text: "Ends today", class_name: styles.dateSoon };
  if (days_left <= 7) return { text: `${days_left} days left`, class_name: styles.dateSoon };
  if (days_left <= 30) return { text: `${days_left} days left`, class_name: styles.dateNear };
  return null;
}

function CouponRow({
  coupon,
  status,
  is_copied,
  is_picker_open,
  is_updating,
  onCopyCode,
  onTogglePicker,
  onSetActive,
  onDelete,
}: CouponRowProps) {
  const edit_href = `/admin/coupons/${coupon.id}/edit`;
  const usage_href = `/admin/coupons/${coupon.id}/usage`;
  const usage_pct = getUsagePercent(coupon);
  const expiry_hint = getExpiryHint(coupon, status);
  const awaiting_gift_cards = coupon.gift_card_claims_awaiting_count ?? 0;
  const usage_bar_class =
    usage_pct === null
      ? ""
      : usage_pct >= 90
        ? styles.usageHigh
        : usage_pct >= 60
          ? styles.usageMid
          : styles.usageLow;

  return (
    <div className={styles.row} role="row">
      {/* Coupon: code + name */}
      <div className={`${styles.cell} ${styles.cellCoupon}`} role="cell">
        <div className={styles.codeLine}>
          <span className={styles.code}>{coupon.code}</span>
          <button
            type="button"
            className={`${styles.iconButton} ${is_copied ? styles.copied : ""}`}
            onClick={() => onCopyCode(coupon.code)}
            title={is_copied ? "Copied" : "Copy code"}
            aria-label={`Copy code ${coupon.code}`}
          >
            {is_copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
        <Link href={edit_href} className={styles.name} title={coupon.description ?? coupon.name}>
          {coupon.name}
        </Link>
        {coupon.discount_type === "gift_card_reward" && awaiting_gift_cards > 0 && (
          <Link href={`${edit_href}#gift-card-claims`} className={styles.giftBadge}>
            {awaiting_gift_cards} gift card{awaiting_gift_cards === 1 ? "" : "s"} to send
          </Link>
        )}
      </div>

      {/* Status: solid block, opens the picker */}
      <div className={`${styles.cell} ${styles.cellBlock} ${styles.cellStatus}`} role="cell" data-label="Status">
        <button
          type="button"
          className={`${styles.block} ${styles.statusButton} ${styles[`status_${status}`]}`}
          onClick={() => onTogglePicker(is_picker_open ? null : coupon.id)}
          disabled={is_updating}
          aria-haspopup="menu"
          aria-expanded={is_picker_open}
          title="Change status"
        >
          {STATUS_META[status].label}
          <ChevronDownIcon className={styles.statusCaret} />
        </button>
        {is_picker_open && (
          <StatusPicker
            coupon={coupon}
            onClose={() => onTogglePicker(null)}
            onSelect={(is_active) => {
              onTogglePicker(null);
              if (is_active !== coupon.is_active) onSetActive(coupon, is_active);
            }}
          />
        )}
      </div>

      {/* Discount: solid block colored by type */}
      <div className={`${styles.cell} ${styles.cellBlock} ${styles.cellDiscount}`} role="cell" data-label="Discount">
        <span
          className={`${styles.block} ${styles[`discount_${coupon.discount_type}`]}`}
          title={getDiscountTypeLabel(coupon)}
        >
          {coupon.discount_type === "gift_card_reward" && <GiftIcon width={14} height={14} />}
          {formatDiscount(coupon)}
        </span>
      </div>

      {/* Applies to */}
      <div
        className={`${styles.cell} ${styles.cellApplies}`}
        role="cell"
        data-label="Applies to"
        title={getAppliesToTitle(coupon)}
      >
        {getAppliesToLabel(coupon)}
      </div>

      {/* Usage */}
      <div className={`${styles.cell} ${styles.cellUsage}`} role="cell" data-label="Usage">
        <Link href={usage_href} className={styles.usageLink} title="See the orders that used this coupon">
          {coupon.times_used}
          <span className={styles.usageMuted}>
            {coupon.usage_limit ? `/ ${coupon.usage_limit}` : coupon.times_used === 1 ? "use" : "uses"}
          </span>
        </Link>
        {usage_pct !== null && (
          <div className={styles.usageBar} aria-hidden="true">
            <span className={usage_bar_class} style={{ width: `${usage_pct}%` }} />
          </div>
        )}
      </div>

      {/* Expires */}
      <div className={`${styles.cell} ${styles.cellExpires}`} role="cell" data-label="Expires">
        {coupon.expires_at ? (
          <span className={styles.dateText}>{formatShortDate(coupon.expires_at)}</span>
        ) : (
          <span className={`${styles.dateText} ${styles.muted}`}>No end date</span>
        )}
        {expiry_hint && (
          <span className={`${styles.dateHint} ${expiry_hint.class_name}`}>{expiry_hint.text}</span>
        )}
      </div>

      {/* Actions */}
      <div className={`${styles.cell} ${styles.cellActions}`} role="cell">
        <Link href={usage_href} className={styles.iconButton} title="Usage and orders" aria-label="Usage and orders">
          <ChartIcon />
        </Link>
        <Link href={edit_href} className={styles.iconButton} title="Edit" aria-label={`Edit ${coupon.code}`}>
          <EditIcon />
        </Link>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.iconButtonDanger}`}
          onClick={() => onDelete(coupon)}
          title="Delete"
          aria-label={`Delete ${coupon.code}`}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

// ── Group ────────────────────────────────────────────────────────────────────

interface CouponsBoardProps {
  groups: CouponGroup[];
  collapsed_keys: Set<CouponStatus>;
  copied_code: string | null;
  open_picker_id: string | null;
  updating_ids: Set<string>;
  onToggleGroup: (key: CouponStatus) => void;
  onCopyCode: (code: string) => void;
  onTogglePicker: (coupon_id: string | null) => void;
  onSetActive: (coupon: Coupon, is_active: boolean) => void;
  onDelete: (coupon: Coupon) => void;
}

const HEAD_COLUMNS: { label: string; class_name?: string }[] = [
  { label: "Coupon" },
  { label: "Status", class_name: styles.headCenter },
  { label: "Discount", class_name: styles.headCenter },
  { label: "Applies to" },
  { label: "Usage" },
  { label: "Expires" },
  { label: "", class_name: styles.headRight },
];

/**
 * Coupons grouped by status, with solid status and discount cells.
 * Rows switch to cards when the board is narrow (container query in the SCSS).
 */
export default function CouponsBoard({
  groups,
  collapsed_keys,
  copied_code,
  open_picker_id,
  updating_ids,
  onToggleGroup,
  onCopyCode,
  onTogglePicker,
  onSetActive,
  onDelete,
}: CouponsBoardProps) {
  const now = new Date();

  return (
    <div>
      {groups.map((group) => {
        const is_open = !collapsed_keys.has(group.key);
        const body_id = `coupon-group-${group.key}`;
        return (
          <section
            key={group.key}
            className={styles.group}
            style={{ "--group-color": group.color } as React.CSSProperties}
          >
            <button
              type="button"
              className={styles.groupHeader}
              onClick={() => onToggleGroup(group.key)}
              aria-expanded={is_open}
              aria-controls={body_id}
            >
              <ChevronRightIcon className={`${styles.chevron} ${is_open ? styles.chevronOpen : ""}`} />
              <span className={styles.groupTitle}>{group.label}</span>
              <span className={styles.groupCount}>
                {group.coupons.length} {group.coupons.length === 1 ? "coupon" : "coupons"}
              </span>
            </button>

            {is_open && (
              <div id={body_id} className={styles.groupBody} role="table" aria-label={`${group.label} coupons`}>
                <div className={styles.headRow} role="row">
                  {HEAD_COLUMNS.map((column, index) => (
                    <div key={index} className={column.class_name} role="columnheader">
                      {column.label}
                    </div>
                  ))}
                </div>
                {group.coupons.map((coupon) => (
                  <CouponRow
                    key={coupon.id}
                    coupon={coupon}
                    status={getCouponStatus(coupon, now)}
                    is_copied={copied_code === coupon.code}
                    is_picker_open={open_picker_id === coupon.id}
                    is_updating={updating_ids.has(coupon.id)}
                    onCopyCode={onCopyCode}
                    onTogglePicker={onTogglePicker}
                    onSetActive={onSetActive}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
