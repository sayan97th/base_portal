"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AdminGiftCardClaim, GiftCardClaimStatus } from "@/types/admin/coupons";
import styles from "./GiftCardRequests.module.scss";
import GiftCardStatusMenu from "./GiftCardStatusMenu";
import {
  formatMoney,
  formatShortDate,
  formatTime,
  getColorForKey,
  getInitials,
} from "../usage/coupon-usage";
import {
  GIFT_CARD_STATUS_META,
  getBrandMeta,
  getOrderHref,
  getOrderReference,
  getSubmissionSourceLabel,
  sumGiftCardClaims,
  type GiftCardClaimGroup,
} from "./gift-card-claims";

interface GiftCardRequestsBoardProps {
  groups: GiftCardClaimGroup[];
  selected_ids: Set<string>;
  updating_ids: Set<string>;
  onToggleSelect: (claim_id: string) => void;
  onToggleSelectMany: (claim_ids: string[], is_selected: boolean) => void;
  onChangeStatus: (claim: AdminGiftCardClaim, is_fulfilled: boolean) => void;
}

// ── Icons ────────────────────────────────────────────────────────────────────

function ChevronIcon({ is_open }: { is_open: boolean }) {
  return (
    <svg
      className={`${styles.chevron} ${is_open ? styles.chevronOpen : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ArrowOutIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

// ── Checkbox ─────────────────────────────────────────────────────────────────

interface BoardCheckboxProps {
  is_checked: boolean;
  is_indeterminate?: boolean;
  label: string;
  onChange: () => void;
}

function BoardCheckbox({ is_checked, is_indeterminate = false, label, onChange }: BoardCheckboxProps) {
  const input_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (input_ref.current) input_ref.current.indeterminate = is_indeterminate;
  }, [is_indeterminate]);

  return (
    <input
      ref={input_ref}
      type="checkbox"
      className={styles.checkbox}
      checked={is_checked}
      onChange={onChange}
      aria-label={label}
    />
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

interface RequestRowProps {
  claim: AdminGiftCardClaim;
  is_selected: boolean;
  is_updating: boolean;
  is_copied: boolean;
  onToggleSelect: () => void;
  onOpenPicker: (claim: AdminGiftCardClaim, anchor: HTMLElement) => void;
  onCopyEmail: (claim: AdminGiftCardClaim) => void;
}

function RequestRow({
  claim,
  is_selected,
  is_updating,
  is_copied,
  onToggleSelect,
  onOpenPicker,
  onCopyEmail,
}: RequestRowProps) {
  const status_meta = GIFT_CARD_STATUS_META[claim.status];
  const brand_meta = getBrandMeta(claim);
  const client_key = claim.client ? String(claim.client.id) : "unknown";
  const is_waiting = claim.status === "pending_details";

  return (
    <div className={`${styles.row} ${is_selected ? styles.rowSelected : ""}`} role="row">
      <div className={styles.cellCheck} role="cell">
        <BoardCheckbox
          is_checked={is_selected}
          label={`Select the request of ${claim.client?.name ?? "this client"}`}
          onChange={onToggleSelect}
        />
      </div>

      <div className={styles.cellClient} role="cell">
        <span className={styles.avatar} style={{ backgroundColor: getColorForKey(client_key) }}>
          {getInitials(claim.client?.name)}
        </span>
        <span className={styles.clientText}>
          <span className={styles.clientName}>{claim.client?.name ?? "Unknown client"}</span>
          <span className={styles.clientMeta} title={claim.client?.email ?? ""}>
            {[claim.client?.company, claim.client?.email].filter(Boolean).join(" · ")}
          </span>
        </span>
      </div>

      <div className={`${styles.cellBlock} ${styles.cellBrand}`} role="cell">
        <span
          className={`${styles.block} ${claim.gift_card_brand ? styles.brandBlock : styles.blockMuted}`}
          style={{ backgroundColor: brand_meta.color, color: brand_meta.text_color }}
        >
          {brand_meta.label}
        </span>
      </div>

      <div className={styles.cellValue} role="cell">
        <span className={styles.amount}>{formatMoney(claim.reward_amount)}</span>
        <span className={styles.muted}>
          {claim.reward_percentage}% of {formatMoney(claim.order_total)}
        </span>
      </div>

      <div className={styles.cellEmail} role="cell">
        {claim.recipient_email ? (
          <>
            <span className={styles.email} title={claim.recipient_email}>
              {claim.recipient_email}
            </span>
            <button
              type="button"
              className={`${styles.iconButton} ${is_copied ? styles.iconButtonDone : ""}`}
              onClick={() => onCopyEmail(claim)}
              aria-label={`Copy ${claim.recipient_email}`}
              title={is_copied ? "Copied" : "Copy email"}
            >
              {is_copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </>
        ) : (
          <span className={styles.muted}>Not provided yet</span>
        )}
      </div>

      <div className={`${styles.cellBlock} ${styles.cellStatus}`} role="cell">
        <button
          type="button"
          className={`${styles.block} ${styles.statusBlock}`}
          style={{ backgroundColor: status_meta.color }}
          onClick={(event) => onOpenPicker(claim, event.currentTarget)}
          disabled={is_waiting || is_updating}
          title={is_waiting ? status_meta.hint : "Change status"}
          aria-haspopup={is_waiting ? undefined : "menu"}
        >
          {is_updating ? "Saving..." : status_meta.label}
        </button>
      </div>

      <div className={styles.cellDate} role="cell">
        {claim.status === "fulfilled" && claim.fulfilled_at ? (
          <>
            <span>Sent {formatShortDate(claim.fulfilled_at)}</span>
            <span className={styles.muted}>{claim.fulfilled_by ? `by ${claim.fulfilled_by.name}` : formatTime(claim.fulfilled_at)}</span>
          </>
        ) : claim.submitted_at ? (
          <>
            <span>{formatShortDate(claim.submitted_at)}</span>
            <span className={styles.muted}>{getSubmissionSourceLabel(claim) || formatTime(claim.submitted_at)}</span>
          </>
        ) : (
          <span className={styles.muted}>Not submitted</span>
        )}
      </div>

      <div className={styles.cellOrder} role="cell">
        <Link href={getOrderHref(claim)} className={styles.orderLink} title="Open order">
          #{getOrderReference(claim)}
          <ArrowOutIcon />
        </Link>
        <span className={styles.muted}>{formatShortDate(claim.created_at)}</span>
      </div>
    </div>
  );
}

// ── Group ────────────────────────────────────────────────────────────────────

interface RequestGroupProps extends Omit<GiftCardRequestsBoardProps, "groups" | "onChangeStatus"> {
  group: GiftCardClaimGroup;
  copied_id: string | null;
  onOpenPicker: (claim: AdminGiftCardClaim, anchor: HTMLElement) => void;
  onCopyEmail: (claim: AdminGiftCardClaim) => void;
}

function RequestGroup({
  group,
  selected_ids,
  updating_ids,
  copied_id,
  onToggleSelect,
  onToggleSelectMany,
  onOpenPicker,
  onCopyEmail,
}: RequestGroupProps) {
  const [is_collapsed, setIsCollapsed] = useState(false);
  const totals = sumGiftCardClaims(group.claims);
  const group_ids = group.claims.map((claim) => claim.id);
  const selected_count = group_ids.filter((id) => selected_ids.has(id)).length;
  const is_all_selected = selected_count === group_ids.length && group_ids.length > 0;

  return (
    <section className={styles.group} style={{ "--group-color": group.color } as React.CSSProperties}>
      <button
        type="button"
        className={styles.groupHeader}
        onClick={() => setIsCollapsed((value) => !value)}
        aria-expanded={!is_collapsed}
      >
        <ChevronIcon is_open={!is_collapsed} />
        <span className={styles.groupTitle}>{group.label}</span>
        <span className={styles.groupCount}>
          {group.claims.length} {group.claims.length === 1 ? "request" : "requests"}
        </span>
        {is_collapsed && <span className={styles.groupCollapsedTotal}>{formatMoney(totals.reward)}</span>}
      </button>

      {!is_collapsed && (
        <div className={styles.groupBody} role="table" aria-label={`${group.label} gift card requests`}>
          <div className={styles.headRow} role="row">
            <div className={styles.cellCheck} role="columnheader">
              <BoardCheckbox
                is_checked={is_all_selected}
                is_indeterminate={selected_count > 0 && !is_all_selected}
                label={`Select every request in ${group.label}`}
                onChange={() => onToggleSelectMany(group_ids, !is_all_selected)}
              />
            </div>
            <div role="columnheader">Client</div>
            <div role="columnheader" className={styles.headCenter}>Gift card</div>
            <div role="columnheader">Value</div>
            <div role="columnheader">Send to</div>
            <div role="columnheader" className={styles.headCenter}>Status</div>
            <div role="columnheader">Submitted</div>
            <div role="columnheader">Order</div>
          </div>

          {group.claims.map((claim) => (
            <RequestRow
              key={claim.id}
              claim={claim}
              is_selected={selected_ids.has(claim.id)}
              is_updating={updating_ids.has(claim.id)}
              is_copied={copied_id === claim.id}
              onToggleSelect={() => onToggleSelect(claim.id)}
              onOpenPicker={onOpenPicker}
              onCopyEmail={onCopyEmail}
            />
          ))}

          <div className={styles.summaryRow} role="row">
            <div />
            <div className={styles.summaryLabel}>Group total</div>
            <div />
            <div className={styles.summaryValue}>
              <span className={styles.amount}>{formatMoney(totals.reward)}</span>
              <span className={styles.muted}>of {formatMoney(totals.order)} in orders</span>
            </div>
            <div />
            <div className={styles.summaryBattery} title="Share of requests per status">
              {(["submitted", "pending_details", "fulfilled"] as GiftCardClaimStatus[]).map((status) => {
                const count = group.claims.filter((claim) => claim.status === status).length;
                if (count === 0) return null;
                return (
                  <span
                    key={status}
                    style={{ flexGrow: count, backgroundColor: GIFT_CARD_STATUS_META[status].color }}
                    title={`${GIFT_CARD_STATUS_META[status].label}: ${count}`}
                  />
                );
              })}
            </div>
            <div />
            <div />
          </div>
        </div>
      )}
    </section>
  );
}

// ── Board ────────────────────────────────────────────────────────────────────

export default function GiftCardRequestsBoard({
  groups,
  selected_ids,
  updating_ids,
  onToggleSelect,
  onToggleSelectMany,
  onChangeStatus,
}: GiftCardRequestsBoardProps) {
  const [picker_state, setPickerState] = useState<{ claim: AdminGiftCardClaim; anchor: HTMLElement } | null>(null);
  const [copied_id, setCopiedId] = useState<string | null>(null);
  const copied_timeout_ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copied_timeout_ref.current) clearTimeout(copied_timeout_ref.current);
    };
  }, []);

  const handleOpenPicker = (claim: AdminGiftCardClaim, anchor: HTMLElement) => {
    setPickerState((current) =>
      current?.claim.id === claim.id ? null : { claim, anchor }
    );
  };

  const handleClosePicker = useCallback(() => setPickerState(null), []);

  const handleSelectStatus = (status: GiftCardClaimStatus) => {
    if (!picker_state) return;
    const { claim } = picker_state;
    setPickerState(null);
    if (status !== claim.status) onChangeStatus(claim, status === "fulfilled");
  };

  const handleCopyEmail = (claim: AdminGiftCardClaim) => {
    if (!claim.recipient_email) return;
    navigator.clipboard
      .writeText(claim.recipient_email)
      .then(() => {
        setCopiedId(claim.id);
        if (copied_timeout_ref.current) clearTimeout(copied_timeout_ref.current);
        copied_timeout_ref.current = setTimeout(() => setCopiedId(null), 1800);
      })
      .catch(() => {});
  };

  return (
    <div className={styles.board}>
      <div className={styles.scroller}>
        {groups.map((group) => (
          <RequestGroup
            key={group.key}
            group={group}
            selected_ids={selected_ids}
            updating_ids={updating_ids}
            copied_id={copied_id}
            onToggleSelect={onToggleSelect}
            onToggleSelectMany={onToggleSelectMany}
            onOpenPicker={handleOpenPicker}
            onCopyEmail={handleCopyEmail}
          />
        ))}
      </div>

      {picker_state && (
        <GiftCardStatusMenu
          claim={picker_state.claim}
          anchor={picker_state.anchor}
          onSelect={handleSelectStatus}
          onClose={handleClosePicker}
        />
      )}
    </div>
  );
}
