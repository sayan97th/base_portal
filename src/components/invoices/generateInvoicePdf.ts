import { jsPDF } from "jspdf";
import type { InvoiceDetail, InvoiceLineItem, ProductType } from "./invoiceData";

const FONT_SIZES = {
  title: 20,
  section_header: 12,
  body: 10,
  small: 9,
};

const COLORS = {
  primary: [17, 24, 39] as [number, number, number],
  secondary: [107, 114, 128] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  table_header_bg: [249, 250, 251] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  success_bg: [240, 253, 244] as [number, number, number],
  success_border: [187, 247, 208] as [number, number, number],
  error: [220, 38, 38] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const PRODUCT_TYPE_PDF_COLORS: Record<ProductType, { bg: [number, number, number]; text: [number, number, number] }> = {
  link_building:        { bg: [237, 233, 254], text: [109, 40, 217] },
  new_content:          { bg: [219, 234, 254], text: [29, 78, 216] },
  content_optimization: { bg: [209, 250, 229], text: [4, 120, 87] },
  content_brief:        { bg: [254, 243, 199], text: [146, 64, 14] },
};

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  link_building:        "Link Building",
  new_content:          "New Content",
  content_optimization: "Content Optimization",
  content_brief:        "Content Briefs",
};

const PRODUCT_TYPE_ORDER: ProductType[] = [
  "link_building",
  "new_content",
  "content_optimization",
  "content_brief",
];

const PAGE_MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

function drawCompanyHeader(doc: jsPDF, y_position: number): number {
  doc.setFontSize(FONT_SIZES.title);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("BASE", PAGE_MARGIN, y_position);

  const base_width = doc.getTextWidth("BASE");
  doc.setFontSize(FONT_SIZES.small);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.secondary);
  doc.text("SEARCH MARKETING", PAGE_MARGIN + base_width + 3, y_position);

  y_position += 8;
  doc.setFontSize(FONT_SIZES.body);
  doc.setTextColor(...COLORS.secondary);
  const company_lines = [
    "BASE Search Marketing",
    "2600 Executive Pkwy #100",
    "Lehi, UT 84043",
  ];
  company_lines.forEach((line) => {
    doc.text(line, PAGE_MARGIN, y_position);
    y_position += 5;
  });

  return y_position;
}

function drawStatusBadge(
  doc: jsPDF,
  status: string,
  x_position: number,
  y_position: number
): void {
  const is_paid = status === "paid";
  const badge_text = is_paid ? "Paid" : "Void";
  const badge_color = is_paid ? COLORS.success : COLORS.error;

  doc.setFontSize(FONT_SIZES.small);
  const text_width = doc.getTextWidth(badge_text);
  const badge_width = text_width + 12;
  const badge_height = 7;

  doc.setFillColor(...badge_color);
  doc.roundedRect(x_position, y_position - badge_height + 2, badge_width, badge_height, 2, 2, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.text(badge_text, x_position + 6, y_position);
}

function drawBilledToSection(doc: jsPDF, invoice: InvoiceDetail, y_position: number): number {
  doc.setFontSize(FONT_SIZES.section_header);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("Invoiced to", PAGE_MARGIN, y_position);

  y_position += 7;
  doc.setFontSize(FONT_SIZES.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.secondary);

  const billed_to = invoice.billed_to;
  const billed_lines = billed_to
    ? [
        billed_to.company_name,
        billed_to.company_description,
        billed_to.address_line_1,
        billed_to.address_line_2,
        billed_to.state,
        billed_to.country,
      ].filter((line): line is string => !!line)
    : [];

  billed_lines.forEach((line) => {
    doc.text(line, PAGE_MARGIN, y_position);
    y_position += 5;
  });

  return y_position;
}

function drawInvoiceMetadata(doc: jsPDF, invoice: InvoiceDetail, y_position: number): number {
  const right_x = PAGE_WIDTH - PAGE_MARGIN;
  const label_x = right_x - 70;

  const meta_fields = [
    { label: "Invoice number", value: invoice.invoice_number },
    { label: "Unique ID", value: invoice.unique_id },
    { label: "Date issued", value: invoice.date_issued },
    { label: "Date due", value: invoice.date_due },
    { label: "Date paid", value: invoice.date_paid ?? "—" },
    { label: "Payment method", value: invoice.payment_method },
  ];

  doc.setFontSize(FONT_SIZES.body);

  meta_fields.forEach((field) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.secondary);
    doc.text(field.label, label_x, y_position, { align: "left" });

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.primary);
    doc.text(field.value, right_x, y_position, { align: "right" });

    y_position += 6;
  });

  return y_position;
}

function drawTableHeader(doc: jsPDF, y_position: number): number {
  const col_positions = {
    item: PAGE_MARGIN,
    price: PAGE_MARGIN + 80,
    quantity: PAGE_MARGIN + 120,
    total: PAGE_WIDTH - PAGE_MARGIN,
  };
  const row_height = 10;

  doc.setFillColor(...COLORS.table_header_bg);
  doc.rect(PAGE_MARGIN, y_position - 5, CONTENT_WIDTH, row_height, "F");
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.rect(PAGE_MARGIN, y_position - 5, CONTENT_WIDTH, row_height, "S");

  doc.setFontSize(FONT_SIZES.small);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.secondary);
  doc.text("Item", col_positions.item + 4, y_position + 1);
  doc.text("Price", col_positions.price, y_position + 1);
  doc.text("Qty", col_positions.quantity, y_position + 1);
  doc.text("Item Total", col_positions.total - 4, y_position + 1, { align: "right" });

  return y_position + row_height;
}

function drawTableRows(doc: jsPDF, items: InvoiceLineItem[], y_position: number): number {
  const col_positions = {
    item: PAGE_MARGIN,
    price: PAGE_MARGIN + 80,
    quantity: PAGE_MARGIN + 120,
    total: PAGE_WIDTH - PAGE_MARGIN,
  };
  const row_height = 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZES.body);

  items.forEach((item) => {
    doc.setDrawColor(...COLORS.border);
    doc.rect(PAGE_MARGIN, y_position - 5, CONTENT_WIDTH, row_height, "S");

    doc.setTextColor(...COLORS.primary);
    doc.text(item.item_name, col_positions.item + 4, y_position + 1);

    doc.setTextColor(...COLORS.secondary);
    doc.text(item.price, col_positions.price, y_position + 1);
    doc.text(`x ${item.quantity}`, col_positions.quantity, y_position + 1);
    doc.text(item.item_total, col_positions.total - 4, y_position + 1, { align: "right" });

    y_position += row_height;
  });

  return y_position;
}

function drawProductSectionHeader(
  doc: jsPDF,
  product_type: ProductType,
  item_count: number,
  y_position: number
): number {
  const colors = PRODUCT_TYPE_PDF_COLORS[product_type];
  const label = PRODUCT_TYPE_LABELS[product_type];
  const header_height = 9;

  doc.setFillColor(...colors.bg);
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.rect(PAGE_MARGIN, y_position - 5, CONTENT_WIDTH, header_height, "FD");

  doc.setFontSize(FONT_SIZES.small);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...colors.text);
  doc.text(label, PAGE_MARGIN + 4, y_position + 1);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.secondary);
  const dot_x = PAGE_MARGIN + 4 + doc.getTextWidth(label) + 4;
  doc.text(`· ${item_count} ${item_count === 1 ? "item" : "items"}`, dot_x, y_position + 1);

  return y_position + header_height;
}

function drawLineItemsTable(doc: jsPDF, invoice: InvoiceDetail, y_position: number): number {
  const has_product_types = invoice.line_items.some((item) => item.product_type);

  if (!has_product_types) {
    y_position = drawTableHeader(doc, y_position);
    y_position = drawTableRows(doc, invoice.line_items, y_position);
    return y_position;
  }

  // Group items by product type
  const grouped = new Map<ProductType | "other", InvoiceLineItem[]>();
  for (const item of invoice.line_items) {
    const key = item.product_type ?? "other";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  const ordered: (ProductType | "other")[] = [];
  for (const pt of PRODUCT_TYPE_ORDER) {
    if (grouped.has(pt)) ordered.push(pt);
  }
  if (grouped.has("other")) ordered.push("other");

  for (const pt of ordered) {
    const items = grouped.get(pt) ?? [];

    if (pt !== "other") {
      y_position = drawProductSectionHeader(doc, pt as ProductType, items.length, y_position);
    } else {
      // Generic "Other" header
      doc.setFillColor(...COLORS.table_header_bg);
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.3);
      doc.rect(PAGE_MARGIN, y_position - 5, CONTENT_WIDTH, 9, "FD");
      doc.setFontSize(FONT_SIZES.small);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.secondary);
      doc.text(`Other · ${items.length} ${items.length === 1 ? "item" : "items"}`, PAGE_MARGIN + 4, y_position + 1);
      y_position += 9;
    }

    y_position = drawTableHeader(doc, y_position);
    y_position = drawTableRows(doc, items, y_position);
    y_position += 4;
  }

  return y_position;
}

function drawSummarySection(doc: jsPDF, invoice: InvoiceDetail, y_position: number): number {
  const right_x = PAGE_WIDTH - PAGE_MARGIN;
  const label_x = right_x - 70;

  y_position += 5;

  doc.setFontSize(FONT_SIZES.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.secondary);
  doc.text("Subtotal", label_x, y_position);
  doc.text(invoice.subtotal, right_x, y_position, { align: "right" });

  if (invoice.discount) {
    y_position += 6;
    doc.setFontSize(FONT_SIZES.body);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(109, 40, 217);
    doc.text("Bulk Discount (10% off)", label_x, y_position);
    doc.setFont("helvetica", "bold");
    doc.text(`-${invoice.discount}`, right_x, y_position, { align: "right" });
    doc.setTextColor(...COLORS.secondary);
  }

  if (invoice.coupon_discounts && invoice.coupon_discounts.length > 0) {
    y_position += 6;

    doc.setFontSize(FONT_SIZES.small);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.secondary);
    doc.text("Coupon Discounts", label_x, y_position);

    y_position += 5;

    invoice.coupon_discounts.forEach((coupon) => {
      const badge_text_width = doc.getTextWidth(coupon.code);
      const badge_w = badge_text_width + 6;
      const badge_h = 5;
      doc.setFillColor(...COLORS.success_bg);
      doc.setDrawColor(...COLORS.success_border);
      doc.setLineWidth(0.2);
      doc.roundedRect(label_x, y_position - 3.5, badge_w, badge_h, 1, 1, "FD");

      doc.setFontSize(FONT_SIZES.small);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.success);
      doc.text(coupon.code, label_x + 3, y_position);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.secondary);
      const after_badge_x = label_x + badge_w + 3;
      const description =
        coupon.discount_type === "percentage"
          ? `${coupon.discount_value}% off`
          : "Fixed discount";
      doc.text(description, after_badge_x, y_position);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.success);
      doc.text(`-${coupon.discount_amount}`, right_x, y_position, { align: "right" });

      y_position += 6;
    });

    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(label_x, y_position - 1, right_x, y_position - 1);
  }

  y_position += 5;

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(label_x, y_position - 3, right_x, y_position - 3);

  doc.setFontSize(FONT_SIZES.body);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("Total", label_x, y_position);
  doc.text(invoice.total, right_x, y_position, { align: "right" });

  y_position += 7;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.secondary);
  doc.text("Credit", label_x, y_position);
  doc.text(invoice.credit, right_x, y_position, { align: "right" });

  return y_position;
}

export function generateInvoicePdf(invoice: InvoiceDetail): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let y_position = 25;

  y_position = drawCompanyHeader(doc, y_position);

  const title_y = 25;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  const invoice_title = "Invoice";
  const title_width = doc.getTextWidth(invoice_title);
  const right_x = PAGE_WIDTH - PAGE_MARGIN;
  doc.text(invoice_title, right_x - title_width - 35, title_y);
  drawStatusBadge(doc, invoice.status, right_x - 30, title_y);

  y_position += 10;

  const billed_start_y = y_position;
  y_position = drawBilledToSection(doc, invoice, y_position);

  drawInvoiceMetadata(doc, invoice, billed_start_y);

  y_position += 10;

  y_position = drawLineItemsTable(doc, invoice, y_position);

  y_position = drawSummarySection(doc, invoice, y_position);

  const file_name = `invoice_${invoice.invoice_number}_${invoice.unique_id}.pdf`;
  doc.save(file_name);
}
