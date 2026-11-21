"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { CouponCheckoutOrder, CouponUsageCheckout, CouponUsageItem } from "@/types/admin/coupons";
import styles from "./CouponUsageBoard.module.scss";
import { ChevronIcon } from "./UsageIcons";
import MoneyCell from "./MoneyCell";
import RowActions from "./RowActions";
import {
  GIFT_CARD_STATUS_LABELS,
  PRODUCT_COLORS,
  describeAppliedProducts,
  formatCouponTerms,
  formatMoney,
  formatShortDate,
  formatTime,
  getColorForKey,
  getInitials,
  getProductLabel,
  getStatusMeta,
  summarizeCheckoutItems,
  sumUsages,
  type CouponCheckoutGroup,
} from "./coupon-usage";

interface CouponCheckoutBoardProps {
  groups: CouponCheckoutGroup[];
  is_gift_card_reward: boolean;
}

/** Background for the products cell: one solid block per discounted product. */
function getProductsBackground(checkout: CouponUsageCheckout): string {
  const colors = checkout.applied_product_types.map((product_type) => PRODUCT_COLORS[product_type] ?? "#c4c4c4");
  if (colors.length <= 1) return colors[0] ?? "#c4c4c4";

  const step = 100 / colors.length;
  const stops = colors.map((color, index) => `${color} ${index * step}% ${(index + 1) * step}%`);
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/** Discount share of an item. Gift cards are earned per order, so items never carry one. */
function getItemDiscount(item: CouponUsageItem, is_gift_card_reward: boolean): number | null {
  return is_gift_card_reward ? null : item.discount_amount;
}

// ── Row ──────────────────────────────────────────────────────────────────────

interface CheckoutRowProps {
  checkout: CouponUsageCheckout;
  group_color: string;
  is_gift_card_reward: boolean;
  is_expanded: boolean;
  onToggle: () => void;
}

function CheckoutRow({ checkout, group_color, is_gift_card_reward, is_expanded, onToggle }: CheckoutRowProps) {
  const status_meta = getStatusMeta(checkout.status);
  const client_key = checkout.client ? String(checkout.client.id ?? checkout.client.email) : "unknown";
  const savings_amount = is_gift_card_reward ? checkout.reward_amount : checkout.discount_amount;
  const applied_products = describeAppliedProducts(checkout);
  const products_label =
    checkout.applied_product_types.length === 1
      ? applied_products
      : `${checkout.applied_product_types.length} products`;
  const items_summary = summarizeCheckoutItems(checkout);

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
        aria-label={`Checkout ${checkout.reference}, ${checkout.order_count} ${checkout.order_count === 1 ? "order" : "orders"}`}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        className={styles.row}
        style={{ "--group-color": group_color } as React.CSSProperties}
      >
        <div className={styles.cellOrder} data-label="Checkout">
          <span className={styles.orderReference}>
            #{checkout.reference}
            {checkout.order_count > 1 && (
              <span className={styles.countTag}>{checkout.order_count} orders</span>
            )}
            {checkout.is_fully_deleted && <span className={styles.deletedTag}>Deleted</span>}
          </span>
          <span className={styles.orderTitle}>{checkout.title || applied_products}</span>
        </div>

        <div className={styles.cellClient} data-label="Client">
          <span className={styles.avatar} style={{ backgroundColor: getColorForKey(client_key) }}>
            {getInitials(checkout.client?.name)}
          </span>
          <span className={styles.clientText}>
            <span className={styles.clientName}>{checkout.client?.name ?? "Unknown client"}</span>
            {/* Every client shares the same organization, so the company is what tells them apart. */}
            <span className={styles.clientEmail} title={checkout.client?.company || checkout.client?.email || undefined}>
              {checkout.client?.company || checkout.client?.email || ""}
            </span>
          </span>
        </div>

        <div className={styles.cellPill} data-label="Promo applied to" title={`Promo applied to ${applied_products}`}>
          <span className={styles.pill} style={{ background: getProductsBackground(checkout) }}>
            {products_label}
          </span>
        </div>

        <div className={styles.cellItems} data-label="Items" title={items_summary}>
          {items_summary}
        </div>

        <div className={styles.cellPill} data-label="Status">
          <span className={styles.pill} style={{ backgroundColor: status_meta.color }}>
            {status_meta.label}
          </span>
        </div>

        <MoneyCell label="Subtotal" value={formatMoney(checkout.subtotal_before_discount)} />

        <MoneyCell
          label={is_gift_card_reward ? "Order gift card" : "Discount"}
          className={styles.cellSavings}
          value={savings_amount > 0 ? `${is_gift_card_reward ? "" : "-"}${formatMoney(savings_amount)}` : formatMoney(0)}
        />

        <MoneyCell label="Total" className={styles.cellTotal} value={formatMoney(checkout.total_amount)} />

        <div className={styles.cellDate} data-label="Used on">
          <span>{formatShortDate(checkout.used_at)}</span>
          <span className={styles.cellDateTime}>{formatTime(checkout.used_at)}</span>
        </div>

        <RowActions
          is_expanded={is_expanded}
          onToggle={onToggle}
          open_url={checkout.session_url}
          open_label="Open checkout"
          open_aria_label={`Open checkout ${checkout.reference}`}
        />
      </div>

      {is_expanded && (
        <CheckoutDetail checkout={checkout} is_gift_card_reward={is_gift_card_reward} group_color={group_color} />
      )}
    </div>
  );
}

// ── Expanded detail ──────────────────────────────────────────────────────────

interface CheckoutOrderSectionProps {
  order: CouponCheckoutOrder;
  is_gift_card_reward: boolean;
}

function CheckoutOrderSection({ order, is_gift_card_reward }: CheckoutOrderSectionProps) {
  const status_meta = getStatusMeta(order.status);
  const order_discount = is_gift_card_reward ? 0 : order.discount_amount;

  return (
    <div className={`${styles.checkoutOrder} ${order.is_coupon_applied ? "" : styles.checkoutOrderMuted}`}>
      <div className={styles.checkoutOrderHeader}>
        <span
          className={styles.miniPill}
          style={{ backgroundColor: PRODUCT_COLORS[order.product_type] ?? "#c4c4c4" }}
        >
          {order.product_label}
        </span>
        <span className={styles.checkoutOrderReference}>#{order.order_reference}</span>
        <span className={styles.miniPill} style={{ backgroundColor: status_meta.color }}>
          {status_meta.label}
        </span>
        {order.is_coupon_applied ? (
          <span className={styles.promoBadge}>Promo applied</span>
        ) : (
          <span className={styles.noPromoBadge}>Not discounted</span>
        )}
        {order.is_order_deleted && <span className={styles.deletedTag}>Deleted</span>}
        {order.order_url && (
          <Link href={order.order_url} className={styles.checkoutOrderLink}>
            Open order
          </Link>
        )}
      </div>

      {order.items.length === 0 ? (
        <p className={styles.detailMuted}>No line items recorded for this order.</p>
      ) : (
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Subtotal</th>
              <th>Promo</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => {
              const item_discount = getItemDiscount(item, is_gift_card_reward);
              return (
                <tr key={`${item.tier_id ?? item.label}-${index}`}>
                  <td>{item.label}</td>
                  <td>{item.quantity}</td>
                  <td>{formatMoney(item.unit_price)}</td>
                  <td>{formatMoney(item.subtotal)}</td>
                  <td>
                    {item.is_coupon_applied ? (
                      <span className={styles.itemPromoApplied}>
                        {item_discount !== null && item_discount > 0 ? `-${formatMoney(item_discount)}` : "Applied"}
                      </span>
                    ) : (
                      <span className={styles.itemPromoNone}>Not applied</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className={styles.checkoutOrderTotals}>
        <span>Subtotal {formatMoney(order.subtotal_before_discount)}</span>
        {order_discount > 0 && (
          <span className={styles.breakdownSavings}>Discount -{formatMoney(order_discount)}</span>
        )}
        {is_gift_card_reward && order.is_coupon_applied && (
          <span className={styles.detailMuted}>Included in the order gift card</span>
        )}
        <strong>Total {formatMoney(order.total_amount)}</strong>
      </div>
    </div>
  );
}

interface CheckoutDetailProps {
  checkout: CouponUsageCheckout;
  is_gift_card_reward: boolean;
  group_color: string;
}

function CheckoutDetail({ checkout, is_gift_card_reward, group_color }: CheckoutDetailProps) {
  const coupon_terms = formatCouponTerms(checkout.coupon_terms);

  return (
    <div className={styles.checkoutDetail} style={{ "--group-color": group_color } as React.CSSProperties}>
      <div className={styles.detailCard}>
        <p className={styles.detailLabel}>
          Everything bought in this checkout, prices at checkout
        </p>
        <div className={styles.checkoutOrders}>
          {checkout.orders.map((order) => (
            <CheckoutOrderSection key={order.id} order={order} is_gift_card_reward={is_gift_card_reward} />
          ))}
        </div>
      </div>

      <div className={styles.checkoutSide}>
        <div className={styles.detailCard}>
          <p className={styles.detailLabel}>Client</p>
          <p className={styles.detailValue}>{checkout.client?.name ?? "Unknown client"}</p>
          {checkout.client?.email && (
            <a href={`mailto:${checkout.client.email}`} className={styles.detailLink}>
              {checkout.client.email}
            </a>
          )}
          {checkout.client?.company && (
            <p className={styles.detailMuted}>Company: {checkout.client.company}</p>
          )}
        </div>

        <div className={styles.detailCard}>
          <p className={styles.detailLabel}>Checkout breakdown</p>
          <dl className={styles.breakdown}>
            <div>
              <dt>Subtotal, {checkout.items_quantity} {checkout.items_quantity === 1 ? "item" : "items"}</dt>
              <dd>{formatMoney(checkout.subtotal_before_discount)}</dd>
            </div>
            <div>
              <dt>Promo applied on {checkout.applied_items_quantity} {checkout.applied_items_quantity === 1 ? "item" : "items"}</dt>
              <dd>{formatMoney(checkout.eligible_subtotal)}</dd>
            </div>
            {is_gift_card_reward ? (
              <div>
                <dt>Order gift card ({coupon_terms}), one per order</dt>
                <dd className={styles.breakdownSavings}>{formatMoney(checkout.reward_amount)}</dd>
              </div>
            ) : (
              <div>
                <dt>Coupon discount ({coupon_terms})</dt>
                <dd className={styles.breakdownSavings}>-{formatMoney(checkout.discount_amount)}</dd>
              </div>
            )}
            <div className={styles.breakdownTotal}>
              <dt>Checkout total</dt>
              <dd>{formatMoney(checkout.total_amount)}</dd>
            </div>
          </dl>
          {is_gift_card_reward && checkout.order_count > 1 && (
            <p className={styles.detailMuted}>
              One gift card covers all {checkout.order_count} products of this checkout. Do not send one per product.
            </p>
          )}
          {checkout.gift_card_claim?.status && (
            <p className={styles.detailMuted}>
              {GIFT_CARD_STATUS_LABELS[checkout.gift_card_claim.status] ?? checkout.gift_card_claim.status}
            </p>
          )}
        </div>

        <div className={styles.detailCard}>
          <p className={styles.detailLabel}>References</p>
          <p className={styles.detailMuted}>
            Used {formatShortDate(checkout.used_at)}, promo applied to{" "}
            {checkout.applied_product_types.map(getProductLabel).join(", ")}
          </p>
          {checkout.has_deleted_orders && (
            <p className={styles.detailMuted}>
              Some orders of this checkout were deleted. The amounts shown are the ones saved at checkout.
            </p>
          )}
          {checkout.invoices.length === 0 ? (
            <p className={styles.detailMuted}>No invoice linked</p>
          ) : (
            checkout.invoices.map((invoice) => (
              <Link key={invoice.id} href={`/admin/invoices/${invoice.id}`} className={styles.detailLink}>
                Invoice {invoice.invoice_number ?? invoice.id.slice(0, 8).toUpperCase()}
                {invoice.status ? `, ${getStatusMeta(invoice.status).label}` : ""}
              </Link>
            ))
          )}
          {checkout.session_url && (
            <Link href={checkout.session_url} className={styles.detailButton}>
              Open checkout session
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Group ────────────────────────────────────────────────────────────────────

interface CheckoutGroupProps {
  group: CouponCheckoutGroup;
  is_gift_card_reward: boolean;
  expanded_ids: Set<string>;
  onToggleRow: (checkout_id: string) => void;
}

function CheckoutGroup({ group, is_gift_card_reward, expanded_ids, onToggleRow }: CheckoutGroupProps) {
  const [is_collapsed, setIsCollapsed] = useState(false);
  const totals = sumUsages(group.checkouts);
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
          {group.checkouts.length} {group.checkouts.length === 1 ? "checkout" : "checkouts"}
        </span>
        {is_collapsed && <span className={styles.groupCollapsedTotal}>{formatMoney(totals.total)}</span>}
      </button>

      {!is_collapsed && (
        <div className={styles.groupBody}>
          <div className={styles.headRow}>
            <div>Checkout</div>
            <div>Client</div>
            <div className={styles.headCenter}>Promo applied to</div>
            <div>Items</div>
            <div className={styles.headCenter}>Status</div>
            <div className={styles.headRight}>Subtotal</div>
            <div className={styles.headRight}>{is_gift_card_reward ? "Order gift card" : "Discount"}</div>
            <div className={styles.headRight}>Total</div>
            <div>Used on</div>
            <div className={styles.headCenter}>Actions</div>
          </div>

          {group.checkouts.map((checkout) => (
            <CheckoutRow
              key={checkout.id}
              checkout={checkout}
              group_color={group.color}
              is_gift_card_reward={is_gift_card_reward}
              is_expanded={expanded_ids.has(checkout.id)}
              onToggle={() => onToggleRow(checkout.id)}
            />
          ))}

          <div className={styles.summaryRow}>
            <div className={styles.summaryLabel}>Group total</div>
            <div />
            <div />
            <div />
            <div />
            <MoneyCell label="Subtotal" value={formatMoney(totals.subtotal)} />
            <MoneyCell
              label={is_gift_card_reward ? "Order gift card" : "Discount"}
              className={styles.cellSavings}
              value={is_gift_card_reward ? formatMoney(totals.reward) : `-${formatMoney(totals.discount)}`}
            />
            <MoneyCell label="Total" className={styles.cellTotal} value={formatMoney(totals.total)} />
            <div />
            <div />
          </div>
        </div>
      )}
    </section>
  );
}

// ── Board ────────────────────────────────────────────────────────────────────

export default function CouponCheckoutBoard({ groups, is_gift_card_reward }: CouponCheckoutBoardProps) {
  const [expanded_ids, setExpandedIds] = useState<Set<string>>(new Set());

  const handleToggleRow = (checkout_id: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(checkout_id)) next.delete(checkout_id);
      else next.add(checkout_id);
      return next;
    });
  };

  return (
    <div className={styles.board}>
      <div className={styles.scroller}>
        {groups.map((group) => (
          <CheckoutGroup
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
