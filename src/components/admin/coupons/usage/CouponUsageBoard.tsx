"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { CouponUsage } from "@/types/admin/coupons";
import styles from "./CouponUsageBoard.module.scss";
import {
  PRODUCT_COLORS,
  formatMoney,
  formatShortDate,
  formatTime,
  getColorForKey,
  getInitials,
  getStatusMeta,
  summarizeItems,
  sumUsages,
  type CouponUsageGroup,
} from "./coupon-usage";

interface CouponUsageBoardProps {
  groups: CouponUsageGroup[];
  is_gift_card_reward: boolean;
}

const GIFT_CARD_STATUS_LABELS: Record<string, string> = {
  pending_details: "Waiting for client details",
  submitted: "Ready to send",
  fulfilled: "Gift card sent",
};

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

function ArrowOutIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

interface UsageRowProps {
  usage: CouponUsage;
  group_color: string;
  is_gift_card_reward: boolean;
  is_expanded: boolean;
  onToggle: () => void;
}

function UsageRow({ usage, group_color, is_gift_card_reward, is_expanded, onToggle }: UsageRowProps) {
  const status_meta = getStatusMeta(usage.status);
  const client_key = usage.client ? String(usage.client.id) : "unknown";
  const savings_amount = is_gift_card_reward ? usage.reward_amount : usage.discount_amount;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <div className={`${styles.rowWrapper} ${is_expanded ? styles.rowWrapperExpanded : ""}`}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={is_expanded}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className={styles.row}
        style={{ "--group-color": group_color } as React.CSSProperties}
      >
        <div className={styles.cellExpand}>
          <ChevronIcon is_open={is_expanded} />
        </div>

        <div className={styles.cellOrder}>
          <span className={styles.orderReference}>#{usage.order_reference}</span>
          <span className={styles.orderTitle}>{usage.order_title || usage.product_label}</span>
        </div>

        <div className={styles.cellClient}>
          <span className={styles.avatar} style={{ backgroundColor: getColorForKey(client_key) }}>
            {getInitials(usage.client?.name)}
          </span>
          <span className={styles.clientText}>
            <span className={styles.clientName}>{usage.client?.name ?? "Unknown client"}</span>
            <span className={styles.clientEmail}>
              {usage.client?.company || usage.client?.organization || usage.client?.email || ""}
            </span>
          </span>
        </div>

        <div className={styles.cellPill}>
          <span
            className={styles.pill}
            style={{ backgroundColor: PRODUCT_COLORS[usage.product_type] ?? "#c4c4c4" }}
          >
            {usage.product_label}
          </span>
        </div>

        <div className={styles.cellItems} title={summarizeItems(usage)}>
          {summarizeItems(usage)}
        </div>

        <div className={styles.cellPill}>
          <span className={styles.pill} style={{ backgroundColor: status_meta.color }}>
            {status_meta.label}
          </span>
        </div>

        <div className={styles.cellMoney}>{formatMoney(usage.subtotal_before_discount)}</div>

        <div className={`${styles.cellMoney} ${styles.cellSavings}`}>
          {savings_amount > 0 ? `${is_gift_card_reward ? "" : "-"}${formatMoney(savings_amount)}` : formatMoney(0)}
        </div>

        <div className={`${styles.cellMoney} ${styles.cellTotal}`}>{formatMoney(usage.total_amount)}</div>

        <div className={styles.cellDate}>
          <span>{formatShortDate(usage.used_at)}</span>
          <span className={styles.cellDateTime}>{formatTime(usage.used_at)}</span>
        </div>

        <div className={styles.cellAction}>
          {usage.order_url ? (
            <Link
              href={usage.order_url}
              onClick={(event) => event.stopPropagation()}
              className={styles.openButton}
              title="Open order"
              aria-label={`Open order ${usage.order_reference}`}
            >
              <ArrowOutIcon />
            </Link>
          ) : null}
        </div>
      </div>

      {is_expanded && (
        <UsageDetail usage={usage} is_gift_card_reward={is_gift_card_reward} group_color={group_color} />
      )}
    </div>
  );
}

// ── Expanded detail ──────────────────────────────────────────────────────────

interface UsageDetailProps {
  usage: CouponUsage;
  is_gift_card_reward: boolean;
  group_color: string;
}

function UsageDetail({ usage, is_gift_card_reward, group_color }: UsageDetailProps) {
  return (
    <div className={styles.detail} style={{ "--group-color": group_color } as React.CSSProperties}>
      <div className={styles.detailCard}>
        <p className={styles.detailLabel}>Purchased items</p>
        {usage.items.length === 0 ? (
          <p className={styles.detailMuted}>No line items recorded for this order.</p>
        ) : (
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {usage.items.map((item, index) => (
                <tr key={`${item.label}-${index}`}>
                  <td>{item.label}</td>
                  <td>{item.quantity}</td>
                  <td>{formatMoney(item.unit_price)}</td>
                  <td>{formatMoney(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.detailCard}>
        <p className={styles.detailLabel}>Client</p>
        <p className={styles.detailValue}>{usage.client?.name ?? "Unknown client"}</p>
        {usage.client?.email && (
          <a href={`mailto:${usage.client.email}`} className={styles.detailLink}>
            {usage.client.email}
          </a>
        )}
        {(usage.client?.company || usage.client?.organization) && (
          <p className={styles.detailMuted}>{usage.client?.company || usage.client?.organization}</p>
        )}
      </div>

      <div className={styles.detailCard}>
        <p className={styles.detailLabel}>Order breakdown</p>
        <dl className={styles.breakdown}>
          <div>
            <dt>Subtotal</dt>
            <dd>{formatMoney(usage.subtotal_before_discount)}</dd>
          </div>
          {is_gift_card_reward ? (
            <div>
              <dt>Gift card earned</dt>
              <dd className={styles.breakdownSavings}>{formatMoney(usage.reward_amount)}</dd>
            </div>
          ) : (
            <div>
              <dt>Coupon discount</dt>
              <dd className={styles.breakdownSavings}>-{formatMoney(usage.discount_amount)}</dd>
            </div>
          )}
          <div className={styles.breakdownTotal}>
            <dt>Order total</dt>
            <dd>{formatMoney(usage.total_amount)}</dd>
          </div>
        </dl>
        {usage.gift_card_claim && (
          <p className={styles.detailMuted}>
            {GIFT_CARD_STATUS_LABELS[usage.gift_card_claim.status] ?? usage.gift_card_claim.status}
          </p>
        )}
      </div>

      <div className={styles.detailCard}>
        <p className={styles.detailLabel}>References</p>
        <p className={styles.detailMuted}>Ordered {formatShortDate(usage.ordered_at)}</p>
        {usage.invoice ? (
          <Link href={`/admin/invoices/${usage.invoice.id}`} className={styles.detailLink}>
            Invoice {usage.invoice.invoice_number ?? usage.invoice.id.slice(0, 8).toUpperCase()}
            {usage.invoice.status ? `, ${getStatusMeta(usage.invoice.status).label}` : ""}
          </Link>
        ) : (
          <p className={styles.detailMuted}>No invoice linked</p>
        )}
        {usage.session_id && (
          <Link href={`/admin/orders/session/${usage.session_id}`} className={styles.detailLink}>
            View full checkout session
          </Link>
        )}
        {usage.order_url && (
          <Link href={usage.order_url} className={styles.detailButton}>
            Open order
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Group ────────────────────────────────────────────────────────────────────

interface UsageGroupProps {
  group: CouponUsageGroup;
  is_gift_card_reward: boolean;
  expanded_ids: Set<string>;
  onToggleRow: (usage_id: string) => void;
}

function UsageGroup({ group, is_gift_card_reward, expanded_ids, onToggleRow }: UsageGroupProps) {
  const [is_collapsed, setIsCollapsed] = useState(false);
  const totals = sumUsages(group.usages);
  const group_style = { "--group-color": group.color } as React.CSSProperties;

  return (
    <section className={styles.group} style={group_style}>
      <button
        type="button"
        className={styles.groupHeader}
        onClick={() => setIsCollapsed((value) => !value)}
        aria-expanded={!is_collapsed}
      >
        <ChevronIcon is_open={!is_collapsed} />
        <span className={styles.groupTitle}>{group.label}</span>
        <span className={styles.groupCount}>
          {group.usages.length} {group.usages.length === 1 ? "order" : "orders"}
        </span>
        {is_collapsed && (
          <span className={styles.groupCollapsedTotal}>{formatMoney(totals.total)}</span>
        )}
      </button>

      {!is_collapsed && (
        <div className={styles.groupBody}>
          <div className={styles.headRow}>
            <div />
            <div>Order</div>
            <div>Client</div>
            <div className={styles.headCenter}>Product</div>
            <div>Items</div>
            <div className={styles.headCenter}>Status</div>
            <div className={styles.headRight}>Subtotal</div>
            <div className={styles.headRight}>{is_gift_card_reward ? "Gift card" : "Discount"}</div>
            <div className={styles.headRight}>Total</div>
            <div>Used on</div>
            <div />
          </div>

          {group.usages.map((usage) => (
            <UsageRow
              key={usage.id}
              usage={usage}
              group_color={group.color}
              is_gift_card_reward={is_gift_card_reward}
              is_expanded={expanded_ids.has(usage.id)}
              onToggle={() => onToggleRow(usage.id)}
            />
          ))}

          <div className={styles.summaryRow}>
            <div />
            <div className={styles.summaryLabel}>Group total</div>
            <div />
            <div />
            <div />
            <div />
            <div className={styles.cellMoney}>{formatMoney(totals.subtotal)}</div>
            <div className={`${styles.cellMoney} ${styles.cellSavings}`}>
              {is_gift_card_reward ? formatMoney(totals.reward) : `-${formatMoney(totals.discount)}`}
            </div>
            <div className={`${styles.cellMoney} ${styles.cellTotal}`}>{formatMoney(totals.total)}</div>
            <div />
            <div />
          </div>
        </div>
      )}
    </section>
  );
}

// ── Board ────────────────────────────────────────────────────────────────────

export default function CouponUsageBoard({ groups, is_gift_card_reward }: CouponUsageBoardProps) {
  const [expanded_ids, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggleRow = (usage_id: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(usage_id)) next.delete(usage_id);
      else next.add(usage_id);
      return next;
    });
  };

  return (
    <div className={styles.board}>
      <div className={styles.scroller}>
        {groups.map((group) => (
          <UsageGroup
            key={group.key}
            group={group}
            is_gift_card_reward={is_gift_card_reward}
            expanded_ids={expanded_ids}
            onToggleRow={handleToggleRow}
          />
        ))}
      </div>
    </div>
  );
}
