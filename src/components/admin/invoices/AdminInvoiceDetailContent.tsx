"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  getAdminInvoice,
  getAdminInvoiceHistory,
  getAdminInvoiceShareLinks,
  toggleAdminInvoiceSharing,
  type InvoiceShareLinks,
} from "@/services/admin/invoice.service";
import type { AdminInvoice, InvoiceCouponDiscount, InvoiceHistoryEntry, InvoiceHistoryActorType } from "@/types/admin";
import {
  EmailInvoiceDialog,
  EditInvoiceDialog,
  EditBillingDetailsDialog,
  MarkAsPaidDialog,
  DuplicateInvoiceDialog,
  DeleteInvoiceDialog,
  VoidInvoiceDialog,
} from "./InvoiceActionDialogs";

interface AdminInvoiceDetailContentProps {
  invoice_id: string;
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

const formatDate = (date_string: string): string =>
  new Date(date_string).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const BackLink: React.FC = () => (
  <Link
    href="/admin/invoices"
    className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
  >
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
    Back to Invoices
  </Link>
);

const StatusBadge: React.FC<{ status: "paid" | "void" }> = ({ status }) => {
  const is_paid = status === "paid";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        is_paid
          ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"
          : "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${is_paid ? "bg-success-500" : "bg-error-500"}`}
      />
      {is_paid ? "Paid" : "Void"}
    </span>
  );
};

interface InfoRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  border?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, border = true }) => (
  <div
    className={`flex items-start justify-between gap-4 py-2.5 ${
      border ? "border-b border-gray-100 dark:border-gray-800" : ""
    }`}
  >
    <dt className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</dt>
    <dd className="text-sm font-medium text-gray-900 dark:text-white text-right">{value}</dd>
  </div>
);

const SkeletonLoader: React.FC = () => (
  <div className="space-y-6">
    <BackLink />
    <div className="flex items-center gap-3">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />
      <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-800" />
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8 space-y-6">
        <div className="h-96 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="lg:col-span-4 space-y-4">
        <div className="h-48 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-32 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  </div>
);

function generateAdminInvoicePdf(invoice: AdminInvoice): void {
  import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const PAGE_MARGIN = 20;
    const PAGE_WIDTH = 210;
    const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
    const right_x = PAGE_WIDTH - PAGE_MARGIN;

    const COLORS = {
      primary: [17, 24, 39] as [number, number, number],
      secondary: [107, 114, 128] as [number, number, number],
      border: [229, 231, 235] as [number, number, number],
      table_header: [249, 250, 251] as [number, number, number],
      success: [22, 163, 74] as [number, number, number],
      error: [220, 38, 38] as [number, number, number],
      white: [255, 255, 255] as [number, number, number],
    };

    let y = 25;

    // Company header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text("BASE", PAGE_MARGIN, y);
    const base_width = doc.getTextWidth("BASE");
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.secondary);
    doc.text("SEARCH MARKETING", PAGE_MARGIN + base_width + 3, y);
    y += 8;
    doc.setFontSize(10);
    ["BASE Search Marketing", "2600 Executive Pkwy #100", "Lehi, UT 84043"].forEach((line) => {
      doc.text(line, PAGE_MARGIN, y);
      y += 5;
    });

    // Invoice title + status badge (right)
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text("Invoice", right_x - 50, 25);
    const is_paid = invoice.status === "paid";
    const badge_color = is_paid ? COLORS.success : COLORS.error;
    const badge_text = is_paid ? "Paid" : "Void";
    doc.setFontSize(9);
    const text_w = doc.getTextWidth(badge_text);
    doc.setFillColor(...badge_color);
    doc.roundedRect(right_x - 25, 19, text_w + 12, 7, 2, 2, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.text(badge_text, right_x - 19, 24.5);

    y += 5;
    const meta_start_y = y;

    // Billed to (left)
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text("Invoiced to", PAGE_MARGIN, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.secondary);
    if (invoice.billed_to) {
      const lines = [
        invoice.billed_to.company_name,
        invoice.billed_to.company_description,
        invoice.billed_to.address_line_1,
        invoice.billed_to.address_line_2,
        invoice.billed_to.state,
        invoice.billed_to.country,
      ].filter((l): l is string => !!l);
      lines.forEach((line) => { doc.text(line, PAGE_MARGIN, y); y += 5; });
    } else {
      doc.text("No billing information available.", PAGE_MARGIN, y);
      y += 5;
    }

    // Invoice meta (right)
    const label_x = right_x - 70;
    let meta_y = meta_start_y;
    const meta_fields = [
      { label: "Invoice number", value: invoice.invoice_number },
      { label: "Unique ID", value: invoice.unique_id },
      { label: "Date issued", value: invoice.date_issued ? formatDate(invoice.date_issued) : "—" },
      { label: "Date paid", value: invoice.date_paid ? formatDate(invoice.date_paid) : "—" },
      { label: "Payment method", value: invoice.payment_method },
      { label: "Currency", value: invoice.currency_type.toUpperCase() },
    ];
    doc.setFontSize(10);
    meta_fields.forEach((field) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.secondary);
      doc.text(field.label, label_x, meta_y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.primary);
      doc.text(field.value, right_x, meta_y, { align: "right" });
      meta_y += 6;
    });

    y = Math.max(y, meta_y) + 8;

    // Customer info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.secondary);
    doc.text(`Customer: ${invoice.user.first_name} ${invoice.user.last_name} (${invoice.user.email})`, PAGE_MARGIN, y);
    y += 10;

    // Line items table
    const col = { item: PAGE_MARGIN, price: PAGE_MARGIN + 80, qty: PAGE_MARGIN + 120, total: right_x };
    const row_h = 10;

    doc.setFillColor(...COLORS.table_header);
    doc.rect(PAGE_MARGIN, y - 5, CONTENT_WIDTH, row_h, "F");
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.rect(PAGE_MARGIN, y - 5, CONTENT_WIDTH, row_h, "S");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.secondary);
    doc.text("Item", col.item + 4, y + 1);
    doc.text("Price", col.price, y + 1);
    doc.text("Qty", col.qty, y + 1);
    doc.text("Total", col.total - 4, y + 1, { align: "right" });
    y += row_h;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    invoice.line_items.forEach((item) => {
      doc.setDrawColor(...COLORS.border);
      doc.rect(PAGE_MARGIN, y - 5, CONTENT_WIDTH, row_h, "S");
      doc.setTextColor(...COLORS.primary);
      doc.text(item.item_name, col.item + 4, y + 1);
      doc.setTextColor(...COLORS.secondary);
      doc.text(formatCurrency(item.price), col.price, y + 1);
      doc.text(`x ${item.quantity}`, col.qty, y + 1);
      doc.text(formatCurrency(item.item_total), col.total - 4, y + 1, { align: "right" });
      y += row_h;
    });

    // Summary
    y += 5;
    const sum_label_x = right_x - 60;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.secondary);
    doc.text("Subtotal", sum_label_x, y);
    doc.text(formatCurrency(invoice.subtotal_amount), right_x, y, { align: "right" });
    y += 7;
    if (invoice.discount_amount != null && invoice.discount_amount > 0) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(109, 40, 217); // violet-700
      doc.text("Bulk Discount (10% off)", sum_label_x, y);
      doc.setFont("helvetica", "bold");
      doc.text(`-${formatCurrency(invoice.discount_amount)}`, right_x, y, { align: "right" });
      doc.setTextColor(...COLORS.secondary);
      y += 7;
    }
    if (invoice.coupon_discounts && invoice.coupon_discounts.length > 0) {
      invoice.coupon_discounts.forEach((coupon) => {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COLORS.secondary);
        const coupon_label = coupon.discount_type === "percentage"
          ? `Coupon ${coupon.code} (${coupon.discount_value}% off)`
          : `Coupon ${coupon.code}`;
        doc.text(coupon_label, sum_label_x, y);
        doc.setTextColor(...COLORS.success);
        doc.text(`-${formatCurrency(coupon.discount_amount)}`, right_x, y, { align: "right" });
        y += 7;
      });
    }
    if (invoice.credit_amount > 0) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.secondary);
      doc.text("Credits Applied", sum_label_x, y);
      doc.setTextColor(...COLORS.success);
      doc.text(`-${formatCurrency(invoice.credit_amount)}`, right_x, y, { align: "right" });
      y += 7;
    }
    doc.setDrawColor(...COLORS.border);
    doc.line(sum_label_x, y - 3, right_x, y - 3);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text("Total", sum_label_x, y);
    doc.text(formatCurrency(invoice.total_amount), right_x, y, { align: "right" });

    doc.save(`invoice_${invoice.invoice_number}_${invoice.unique_id}.pdf`);
  });
}

// ── Share Dialog ─────────────────────────────────────────────────────────────

interface ShareDialogProps {
  invoice_id: string;
  onClose: () => void;
}

function ShareDialog({ invoice_id, onClose }: ShareDialogProps) {
  const [share_links, setShareLinks] = useState<InvoiceShareLinks | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied_key, setCopiedKey] = useState<"private" | "public" | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAdminInvoiceShareLinks(invoice_id);
        setShareLinks(data);
      } catch {
        setError("Failed to load share links.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [invoice_id]);

  const handleToggle = async () => {
    if (!share_links || toggling) return;
    setToggling(true);
    try {
      const updated = await toggleAdminInvoiceSharing(invoice_id, !share_links.sharing_enabled);
      setShareLinks(updated);
    } catch {
      setError("Failed to update sharing settings.");
    } finally {
      setToggling(false);
    }
  };

  const handleCopy = async (type: "private" | "public") => {
    if (!share_links) return;
    const url = type === "private" ? share_links.private_link : share_links.public_link;
    await navigator.clipboard.writeText(url);
    setCopiedKey(type);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Get link</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {loading && (
            <div className="space-y-5">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="flex gap-2">
                    <div className="h-10 flex-1 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                    <div className="h-10 w-28 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="h-3 w-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              ))}
            </div>
          )}

          {error && !loading && (
            <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
          )}

          {!loading && share_links && (
            <div className="space-y-5">
              {/* Sharing toggle */}
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">Shared links</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {share_links.sharing_enabled ? "Links are currently active" : "Links are currently disabled"}
                  </p>
                </div>
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                    share_links.sharing_enabled
                      ? "bg-brand-500 dark:bg-brand-400"
                      : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      share_links.sharing_enabled ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Private link */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Private link</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={share_links.private_link}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  />
                  <button
                    onClick={() => handleCopy("private")}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {copied_key === "private" ? (
                      <>
                        <svg className="h-3.5 w-3.5 text-success-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                        Copy link
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Client will need to sign in to view invoice.</p>
              </div>

              {/* Public link */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Public link</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={share_links.public_link}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  />
                  <button
                    onClick={() => handleCopy("public")}
                    disabled={!share_links.sharing_enabled}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {copied_key === "public" ? (
                      <>
                        <svg className="h-3.5 w-3.5 text-success-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                        Copy link
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Anybody with this link can view and pay the invoice.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── History timeline helpers ──────────────────────────────────────────────────

const ACTOR_STYLES: Record<InvoiceHistoryActorType, string> = {
  system:  "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  client:  "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400",
  admin:   "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400",
};

function groupHistoryByDate(entries: InvoiceHistoryEntry[]): Array<{ date_label: string; entries: InvoiceHistoryEntry[] }> {
  const groups: Record<string, InvoiceHistoryEntry[]> = {};
  entries.forEach((entry) => {
    const label = new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(entry);
  });
  return Object.entries(groups).map(([date_label, entries]) => ({ date_label, entries }));
}

// ── Actions dropdown ──────────────────────────────────────────────────────────

type ActiveDialog = "email" | "edit" | "edit_billing" | "mark_paid" | "duplicate" | "delete" | "void" | null;

interface ActionsDropdownProps {
  onSelect: (dialog: ActiveDialog) => void;
}

function ActionsDropdown({ onSelect }: ActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const container_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (container_ref.current && !container_ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleSelect = (dialog: ActiveDialog) => {
    setOpen(false);
    onSelect(dialog);
  };

  const menu_items: { label: string; dialog: ActiveDialog; danger?: boolean; separator_before?: boolean }[] = [
    { label: "Email invoice", dialog: "email" },
    { label: "Edit", dialog: "edit" },
    { label: "Edit Billing Details", dialog: "edit_billing" },
    { label: "Mark as paid", dialog: "mark_paid", separator_before: true },
    { label: "Duplicate", dialog: "duplicate" },
    { label: "Void", dialog: "void", separator_before: true },
    { label: "Delete", dialog: "delete", danger: true },
  ];

  return (
    <div className="relative" ref={container_ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        Actions
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {menu_items.map((item) => (
            <React.Fragment key={item.dialog}>
              {item.separator_before && (
                <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
              )}
              <button
                onClick={() => handleSelect(item.dialog)}
                className={`flex w-full items-center px-4 py-2.5 text-sm transition-colors ${
                  item.danger
                    ? "text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                }`}
              >
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminInvoiceDetailContent({ invoice_id }: AdminInvoiceDetailContentProps) {
  const [invoice, setInvoice] = useState<AdminInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active_tab, setActiveTab] = useState<"details" | "history">("details");
  const [share_dialog_open, setShareDialogOpen] = useState(false);
  const [active_dialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [history_entries, setHistoryEntries] = useState<InvoiceHistoryEntry[]>([]);
  const [history_loading, setHistoryLoading] = useState(false);
  const [history_error, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoice = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAdminInvoice(invoice_id);
        setInvoice(data);
      } catch (err: unknown) {
        const api_error = err as { message?: string };
        if (api_error?.message?.includes("not found") || api_error?.message?.includes("404")) {
          setError("not_found");
        } else {
          setError("Failed to load invoice. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };
    loadInvoice();
  }, [invoice_id]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await getAdminInvoiceHistory(invoice_id);
      setHistoryEntries(data);
    } catch {
      setHistoryError("Failed to load history.");
    } finally {
      setHistoryLoading(false);
    }
  }, [invoice_id]);

  useEffect(() => {
    if (active_tab === "history") loadHistory();
  }, [active_tab, loadHistory]);

  if (loading) return <SkeletonLoader />;

  if (error === "not_found" || !invoice) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-20 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Invoice not found</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">The invoice you&apos;re looking for doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="rounded-lg bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      </div>
    );
  }

  const is_credits = invoice.currency_type === "credits";

  const formatAmount = (amount: number): string =>
    is_credits ? `${amount} credits` : formatCurrency(amount);

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Invoice #{invoice.invoice_number}
          </h1>
          <StatusBadge status={invoice.status} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShareDialogOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Share
          </button>
          <button
            onClick={() => generateAdminInvoicePdf(invoice)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download PDF
          </button>
          <ActionsDropdown onSelect={setActiveDialog} />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex gap-0" aria-label="Invoice tabs">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              active_tab === "details"
                ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
            Details
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              active_tab === "history"
                ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
          </button>
        </nav>
      </div>

      {/* ── History tab ───────────────────────────────────── */}
      {active_tab === "history" && (
        <div className="min-h-[300px]">
          {history_loading && (
            <div className="space-y-6 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {history_error && !history_loading && (
            <div className="flex items-center gap-3 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              {history_error}
              <button
                onClick={loadHistory}
                className="ml-auto text-xs font-medium underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          )}

          {!history_loading && !history_error && history_entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No history yet</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Activity for this invoice will appear here</p>
            </div>
          )}

          {!history_loading && !history_error && history_entries.length > 0 && (
            <div className="space-y-8">
              {groupHistoryByDate(history_entries).map(({ date_label, entries }) => (
                <div key={date_label}>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {date_label}
                  </p>
                  <div className="relative space-y-0">
                    {/* Vertical connector line */}
                    <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-200 dark:bg-gray-700" />
                    {entries.map((entry) => (
                      <div key={entry.id} className="relative flex items-start gap-4 py-3">
                        <div
                          className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ACTOR_STYLES[entry.actor_type]}`}
                        >
                          {entry.actor_initials}
                        </div>
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="text-sm text-gray-800 dark:text-gray-200">
                            <span className="font-medium">{entry.actor_name}</span>
                            {" "}
                            <span className="text-gray-600 dark:text-gray-400">{entry.event}</span>
                          </p>
                          {entry.description && (
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              {entry.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {new Date(entry.created_at).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Details tab ───────────────────────────────────── */}
      {active_tab === "details" && (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Main column ───────────────────────────────── */}
        <div className="space-y-6 lg:col-span-8">

          {/* Invoice document card */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            {/* Company header strip */}
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-5 dark:border-gray-800 dark:bg-white/[0.02]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold tracking-wide text-gray-900 dark:text-white">BASE</span>
                    <span className="text-xs font-medium uppercase tracking-widest text-gray-400">Search Marketing</span>
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    <p>BASE Search Marketing</p>
                    <p>2600 Executive Pkwy #100, Lehi, UT 84043</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">Invoice</p>
                  <p className="font-mono text-sm text-gray-500 dark:text-gray-400">{invoice.invoice_number}</p>
                  <div className="mt-2">
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
              </div>
            </div>

            {/* Billed to + Invoice meta */}
            <div className="grid grid-cols-1 gap-6 px-6 py-5 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Invoiced to
                </p>
                {invoice.billed_to ? (
                  <div className="space-y-0.5 text-sm text-gray-700 dark:text-gray-300">
                    {invoice.billed_to.company_name && (
                      <p className="font-medium text-gray-900 dark:text-white">{invoice.billed_to.company_name}</p>
                    )}
                    {invoice.billed_to.company_description && <p>{invoice.billed_to.company_description}</p>}
                    {invoice.billed_to.address_line_1 && <p>{invoice.billed_to.address_line_1}</p>}
                    {invoice.billed_to.address_line_2 && <p>{invoice.billed_to.address_line_2}</p>}
                    {invoice.billed_to.state && <p>{invoice.billed_to.state}</p>}
                    {invoice.billed_to.country && <p>{invoice.billed_to.country}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500">No billing information available.</p>
                )}
              </div>

              <div className="sm:text-right">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Invoice Details
                </p>
                <dl className="space-y-1 text-sm">
                  {[
                    { label: "Unique ID", value: <span className="font-mono">{invoice.unique_id}</span> },
                    { label: "Date issued", value: invoice.date_issued ? formatDate(invoice.date_issued) : "—" },
                    { label: "Date due", value: invoice.date_due ? formatDate(invoice.date_due) : "—" },
                    { label: "Date paid", value: invoice.date_paid ? <span className="text-success-600 dark:text-success-400">{formatDate(invoice.date_paid)}</span> : "—" },
                    { label: "Payment method", value: invoice.payment_method },
                    { label: "Currency", value: invoice.currency_type.toUpperCase() },
                  ].map((field) => (
                    <div key={field.label} className="flex justify-between gap-6 sm:justify-end">
                      <dt className="text-gray-500 dark:text-gray-400">{field.label}</dt>
                      <dd className="font-medium text-gray-900 dark:text-white">{field.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* Line items table */}
            <div className="border-t border-gray-100 dark:border-gray-800">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-white/[0.02]">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Item Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {invoice.line_items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">
                          No line items.
                        </td>
                      </tr>
                    ) : (
                      invoice.line_items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                            {item.item_name}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                            {formatAmount(item.price)}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                            &times; {item.quantity}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-700 dark:text-gray-300">
                            {formatAmount(item.item_total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
              <div className="ml-auto max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-700 dark:text-gray-300">{formatAmount(invoice.subtotal_amount)}</span>
                </div>
                {invoice.discount_amount != null && invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-medium text-violet-600 dark:text-violet-400">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                      </svg>
                      Bulk Discount (10% off)
                    </span>
                    <span className="font-semibold tabular-nums text-violet-600 dark:text-violet-400">
                      -{formatAmount(invoice.discount_amount)}
                    </span>
                  </div>
                )}
                {invoice.coupon_discounts && invoice.coupon_discounts.length > 0 && (
                  <div className="space-y-1 border-t border-dashed border-gray-200 pt-2 dark:border-gray-700">
                    <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                      </svg>
                      Coupons Applied
                    </p>
                    {invoice.coupon_discounts.map((coupon: InvoiceCouponDiscount) => (
                      <div key={coupon.code} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                            {coupon.code}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {coupon.discount_type === "percentage"
                              ? `${coupon.discount_value}% off`
                              : "Fixed discount"}
                          </span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          -{formatAmount(coupon.discount_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {invoice.credit_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Credits Applied</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      -{formatAmount(invoice.credit_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2 text-sm dark:border-gray-700">
                  <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatAmount(invoice.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar ───────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-4">

          {/* Customer card */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">Customer</span>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-400">
                  {invoice.user.first_name.charAt(0).toUpperCase()}
                  {invoice.user.last_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {invoice.user.first_name} {invoice.user.last_name}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {invoice.user.email}
                  </p>
                </div>
              </div>
              <dl className="mt-4 space-y-0">
                <InfoRow label="User ID" value={`#${invoice.user.id}`} border={false} />
              </dl>
            </div>
          </div>

          {/* Invoice status card */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                <span className="text-sm font-semibold text-gray-800 dark:text-white/90">Invoice Info</span>
              </div>
              <StatusBadge status={invoice.status} />
            </div>
            <dl className="px-5 py-1">
              <InfoRow label="Invoice #" value={<span className="font-mono">{invoice.invoice_number}</span>} />
              <InfoRow label="Payment Method" value={invoice.payment_method} />
              <InfoRow label="Currency" value={invoice.currency_type.toUpperCase()} />
              <InfoRow label="Subtotal" value={formatAmount(invoice.subtotal_amount)} />
              {invoice.discount_amount != null && invoice.discount_amount > 0 && (
                <InfoRow
                  label={
                    <span className="flex items-center gap-1.5 font-medium text-violet-600 dark:text-violet-400">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                      </svg>
                      Bulk Discount (10%)
                    </span>
                  }
                  value={<span className="font-semibold tabular-nums text-violet-600 dark:text-violet-400">-{formatAmount(invoice.discount_amount)}</span>}
                />
              )}
              {invoice.coupon_discounts && invoice.coupon_discounts.length > 0 && (
                <>
                  {invoice.coupon_discounts.map((coupon: InvoiceCouponDiscount) => (
                    <InfoRow
                      key={coupon.code}
                      label={
                        <span className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                            {coupon.code}
                          </span>
                          <span className="text-xs">
                            {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : "Fixed"}
                          </span>
                        </span>
                      }
                      value={<span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">-{formatAmount(coupon.discount_amount)}</span>}
                    />
                  ))}
                </>
              )}
              {invoice.credit_amount > 0 && (
                <InfoRow
                  label="Credits Applied"
                  value={<span className="text-emerald-600 dark:text-emerald-400">-{formatAmount(invoice.credit_amount)}</span>}
                />
              )}
              <InfoRow
                label="Total"
                value={<span className="text-base font-bold text-gray-900 dark:text-white">{formatAmount(invoice.total_amount)}</span>}
              />
              {invoice.date_issued && <InfoRow label="Date Issued" value={formatDate(invoice.date_issued)} />}
              {invoice.date_due && <InfoRow label="Due Date" value={formatDate(invoice.date_due)} />}
              {invoice.date_paid && (
                <InfoRow
                  label="Date Paid"
                  value={<span className="text-success-600 dark:text-success-400">{formatDate(invoice.date_paid)}</span>}
                  border={false}
                />
              )}
            </dl>
          </div>

          {/* Related order card */}
          {invoice.order_id && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                <span className="text-sm font-semibold text-gray-800 dark:text-white/90">Related Order</span>
              </div>
              <div className="px-5 py-4">
                <p className="mb-3 font-mono text-xs text-gray-500 dark:text-gray-400 break-all">{invoice.order_id}</p>
                <Link
                  href={`/admin/orders/${invoice.order_id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
                >
                  View Order Details
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </div>
            </div>
          )}

          {/* Timestamps card */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-gray-800 dark:text-white/90">Timestamps</span>
            </div>
            <dl className="px-5 py-1">
              <InfoRow label="Created" value={formatDate(invoice.created_at)} />
              <InfoRow label="Last Updated" value={formatDate(invoice.updated_at)} border={false} />
            </dl>
          </div>
        </div>
      </div>
      )}

      {share_dialog_open && (
        <ShareDialog invoice_id={invoice_id} onClose={() => setShareDialogOpen(false)} />
      )}

      {active_dialog === "email" && (
        <EmailInvoiceDialog
          invoice={invoice}
          onClose={() => setActiveDialog(null)}
        />
      )}
      {active_dialog === "edit" && (
        <EditInvoiceDialog
          invoice={invoice}
          onClose={() => setActiveDialog(null)}
          onSuccess={(updated) => { setInvoice(updated); setActiveDialog(null); }}
        />
      )}
      {active_dialog === "edit_billing" && (
        <EditBillingDetailsDialog
          invoice={invoice}
          onClose={() => setActiveDialog(null)}
          onSuccess={(updated) => { setInvoice(updated); setActiveDialog(null); }}
        />
      )}
      {active_dialog === "mark_paid" && (
        <MarkAsPaidDialog
          invoice={invoice}
          onClose={() => setActiveDialog(null)}
          onSuccess={(updated) => { setInvoice(updated); setActiveDialog(null); }}
        />
      )}
      {active_dialog === "duplicate" && (
        <DuplicateInvoiceDialog
          invoice={invoice}
          onClose={() => setActiveDialog(null)}
          onSuccess={() => setActiveDialog(null)}
        />
      )}
      {active_dialog === "delete" && (
        <DeleteInvoiceDialog
          invoice={invoice}
          onClose={() => setActiveDialog(null)}
          onSuccess={() => setActiveDialog(null)}
        />
      )}
      {active_dialog === "void" && (
        <VoidInvoiceDialog
          invoice={invoice}
          onClose={() => setActiveDialog(null)}
          onVoidSuccess={(updated) => { setInvoice(updated); setActiveDialog(null); }}
          onDeleteSuccess={() => setActiveDialog(null)}
        />
      )}
    </div>
  );
}
