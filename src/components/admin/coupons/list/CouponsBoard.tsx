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
  CartIcon,
  ChartIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  EditIcon,
  GiftIcon,
  GridIcon,
  LayersIcon,
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
    hint: "Clients can redeem it within its dates",
    color: STATUS_META.active.color,
  },
  {
    is_active: false,
    label: "Disabled",
    hint: "Paused, clients cannot redeem it",
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
      <p className={styles.pickerTitle}>Coupon status</p>
      {PICKER_OPTIONS.map((option) => {
        const is_current = coupon.is_active === option.is_active;
        return (
          <button
            key={option.label}
            type="button"
            role="menuitemradio"
            aria-checked={is_current}
            className={`${styles.pickerOption} ${is_current ? styles.pickerOptionCurrent : ""}`}
            onClick={() => onSelect(option.is_active)}
          >
            <span className={styles.pickerDot} style={{ background: option.color }} />
            <span className={styles.pickerText}>
              <span className={styles.pickerLabel}>{option.label}</span>
              <span className={styles.pickerHint}>{option.hint}</span>
            </span>
            {is_current && <CheckIcon className={styles.pickerCheck} />}
          </button>
        );
      })}
    </div>
  );
}

// ── Row helpers ──────────────────────────────────────────────────────────────

type HintTone = "danger" | "warning" | "info";

function getDateHint(coupon: Coupon, status: CouponStatus): { text: string; tone: HintTone } | null {
  if (status === "scheduled" && coupon.starts_at) {
    return { text: `Starts ${formatShortDate(coupon.starts_at)}`, tone: "info" };
  }
  if (status !== "active") return null;
  const days_left = daysUntil(coupon.expires_at);
  if (days_left === null) return null;
  if (days_left <= 1) return { text: "Ends today", tone: "danger" };
  if (days_left <= 7) return { text: `${days_left} days left`, tone: "danger" };
  if (days_left <= 30) return { text: `${days_left} days left`, tone: "warning" };
  return null;
}

const HINT_TONE_CLASS: Record<HintTone, string> = {
  danger: styles.hintDanger,
  warning: styles.hintWarning,
  info: styles.hintInfo,
};

function getUsageTone(usage_pct: number): string {
  if (usage_pct >= 90) return styles.usageHigh;
  if (usage_pct >= 60) return styles.usageMid;
  return styles.usageLow;
}

function AppliesToIcon({ coupon }: { coupon: Coupon }) {
  if (coupon.applies_to === "specific_product") return <LayersIcon />;
  if (coupon.applies_to === "minimum_purchase") return <CartIcon />;
  return <GridIcon />;
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
  const gift_cards_href = `/admin/coupons/${coupon.id}/gift-cards`;
  const is_gift_card_reward = coupon.discount_type === "gift_card_reward";
  const usage_pct = getUsagePercent(coupon);
  const date_hint = getDateHint(coupon, status);
  const awaiting_gift_cards = coupon.gift_card_claims_awaiting_count ?? 0;

  return (
    <div
      className={`${styles.row} ${is_picker_open ? styles.rowRaised : ""}`}
      role="row"
      style={{ "--row-color": STATUS_META[status].color } as React.CSSProperties}
    >
      {/* Coupon: code, name and description */}
      <div className={`${styles.cell} ${styles.cellCoupon}`} role="cell">
        <div className={styles.codeLine}>
          <span className={styles.code}>{coupon.code}</span>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.copyButton} ${is_copied ? styles.copied : ""}`}
            onClick={() => onCopyCode(coupon.code)}
            title={is_copied ? "Copied" : "Copy code"}
            aria-label={`Copy code ${coupon.code}`}
          >
            {is_copied ? <CheckIcon /> : <CopyIcon />}
          </button>
        </div>
        <Link href={edit_href} className={styles.name}>
          {coupon.name}
        </Link>
        {coupon.description && (
          <p className={styles.description} title={coupon.description}>
            {coupon.description}
          </p>
        )}
        {is_gift_card_reward && awaiting_gift_cards > 0 && (
          <Link href={`${gift_cards_href}?status=submitted`} className={styles.giftBadge}>
            <GiftIcon />
            {awaiting_gift_cards} gift card{awaiting_gift_cards === 1 ? "" : "s"} to send
          </Link>
        )}
      </div>

      {/* Status pill, opens the picker */}
      <div className={`${styles.cell} ${styles.cellStatus}`} role="cell">
        <button
          type="button"
          className={`${styles.statusPill} ${styles[`status_${status}`]}`}
          onClick={() => onTogglePicker(is_picker_open ? null : coupon.id)}
          disabled={is_updating}
          aria-haspopup="menu"
          aria-expanded={is_picker_open}
          title="Change status"
        >
          <span className={styles.statusDot} />
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

      {/* Discount */}
      <div className={`${styles.cell} ${styles.cellDiscount}`} role="cell" data-label="Discount">
        <span
          className={`${styles.discountPill} ${styles[`discount_${coupon.discount_type}`]}`}
          title={getDiscountTypeLabel(coupon)}
        >
          {coupon.discount_type === "gift_card_reward" && <GiftIcon />}
          {formatDiscount(coupon)}
        </span>
      </div>

      {/* Applies to */}
      <div className={`${styles.cell} ${styles.cellApplies}`} role="cell" data-label="Applies to">
        <span className={styles.applies} title={getAppliesToTitle(coupon)}>
          <AppliesToIcon coupon={coupon} />
          <span className={styles.appliesText}>{getAppliesToLabel(coupon)}</span>
        </span>
      </div>

      {/* Usage */}
      <div className={`${styles.cell} ${styles.cellUsage}`} role="cell" data-label="Usage">
        <Link href={usage_href} className={styles.usageLink} title="See the orders that used this coupon">
          <span className={styles.usageValue}>{coupon.times_used}</span>
          <span className={styles.usageMuted}>
            {coupon.usage_limit ? `of ${coupon.usage_limit}` : coupon.times_used === 1 ? "use" : "uses"}
          </span>
        </Link>
        {usage_pct !== null ? (
          <div
            className={styles.usageBar}
            role="progressbar"
            aria-valuenow={Math.round(usage_pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${Math.round(usage_pct)}% of the usage limit`}
          >
            <span className={getUsageTone(usage_pct)} style={{ width: `${Math.max(usage_pct, 2)}%` }} />
          </div>
        ) : (
          <span className={styles.subtle}>No limit</span>
        )}
      </div>

      {/* Expires */}
      <div className={`${styles.cell} ${styles.cellExpires}`} role="cell" data-label="Expires">
        <span className={`${styles.dateText} ${coupon.expires_at ? "" : styles.subtle}`}>
          {coupon.expires_at ? formatShortDate(coupon.expires_at) : "No end date"}
        </span>
        {date_hint && (
          <span className={`${styles.dateHint} ${HINT_TONE_CLASS[date_hint.tone]}`}>{date_hint.text}</span>
        )}
      </div>

      {/* Actions */}
      {/* Actions: always labeled. Gift card coupons have four, so they wrap into a 2x2 grid. */}
      <div
        className={`${styles.cell} ${styles.cellActions} ${is_gift_card_reward ? styles.cellActionsStacked : ""}`}
        role="cell"
      >
        <Link
          href={usage_href}
          className={styles.actionButton}
          title="See usage and orders"
          aria-label={`Usage of ${coupon.code}`}
        >
          <ChartIcon />
          <span className={styles.actionLabel}>Usage</span>
        </Link>
        {is_gift_card_reward && (
          <Link
            href={gift_cards_href}
            className={`${styles.actionButton} ${styles.actionGift}`}
            title="See gift card requests"
            aria-label={`Gift cards of ${coupon.code}`}
          >
            <GiftIcon />
            <span className={styles.actionLabel}>Gift cards</span>
          </Link>
        )}
        <Link
          href={edit_href}
          className={styles.actionButton}
          title="Edit coupon"
          aria-label={`Edit ${coupon.code}`}
        >
          <EditIcon />
          <span className={styles.actionLabel}>Edit</span>
        </Link>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionDanger}`}
          onClick={() => onDelete(coupon)}
          title="Delete coupon"
          aria-label={`Delete ${coupon.code}`}
        >
          <TrashIcon />
          <span className={styles.actionLabel}>Delete</span>
        </button>
      </div>
    </div>
  );
}

// ── Board ────────────────────────────────────────────────────────────────────

interface CouponsBoardProps {
  groups: CouponGroup[];
  /** Group rows are hidden when a single status is filtered, they would only repeat the tab. */
  show_group_headers: boolean;
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
  { label: "Status" },
  { label: "Discount" },
  { label: "Applies to" },
  { label: "Usage" },
  { label: "Expires" },
  { label: "Actions", class_name: styles.headActions },
];

/**
 * Coupon list grouped by status, with collapsible groups and an inline status
 * picker. Rows become cards when the page is narrow (container query in the SCSS).
 */
export default function CouponsBoard({
  groups,
  show_group_headers,
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
    <div className={styles.board} role="table" aria-label="Coupons">
      <div className={styles.headRow} role="row">
        {HEAD_COLUMNS.map((column) => (
          <div key={column.label} className={column.class_name} role="columnheader">
            <span className={column.label === "Actions" ? "sr-only" : undefined}>{column.label}</span>
          </div>
        ))}
      </div>

      {groups.map((group) => {
        const is_open = !show_group_headers || !collapsed_keys.has(group.key);
        const body_id = `coupon-group-${group.key}`;
        const group_uses = group.coupons.reduce((total, coupon) => total + coupon.times_used, 0);

        return (
          <div
            key={group.key}
            className={styles.group}
            role="rowgroup"
            style={{ "--group-color": group.color } as React.CSSProperties}
          >
            {show_group_headers && (
              <div className={styles.groupRow} role="row">
                <div role="cell" className={styles.groupCell}>
                  <button
                    type="button"
                    className={styles.groupHeader}
                    onClick={() => onToggleGroup(group.key)}
                    aria-expanded={is_open}
                    aria-controls={body_id}
                  >
                    <ChevronRightIcon className={`${styles.chevron} ${is_open ? styles.chevronOpen : ""}`} />
                    <span className={styles.groupDot} />
                    <span className={styles.groupTitle}>{group.label}</span>
                    <span className={styles.groupCount}>{group.coupons.length}</span>
                    <span className={styles.groupMeta}>
                      {STATUS_META[group.key].hint}
                      <span aria-hidden="true"> · </span>
                      {group_uses} {group_uses === 1 ? "use" : "uses"}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {is_open && (
              <div id={body_id} className={styles.groupBody}>
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
          </div>
        );
      })}
    </div>
  );
}
