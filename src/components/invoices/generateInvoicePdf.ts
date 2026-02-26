import { jsPDF } from "jspdf";
import type { InvoiceDetail } from "./invoiceData";

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
  error: [220, 38, 38] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

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
  doc.roundedRect(
    x_position,
    y_position - badge_height + 2,
    badge_width,
    badge_height,
    2,
    2,
    "F"
  );

  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.text(badge_text, x_position + 6, y_position);
}

function drawBilledToSection(
  doc: jsPDF,
  invoice: InvoiceDetail,
  y_position: number
): number {
  doc.setFontSize(FONT_SIZES.section_header);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("Invoiced to", PAGE_MARGIN, y_position);

  y_position += 7;
  doc.setFontSize(FONT_SIZES.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.secondary);

  const billed_lines = [
    invoice.billed_to.company_name,
    invoice.billed_to.company_description,
    invoice.billed_to.address_line_1,
    invoice.billed_to.address_line_2,
    invoice.billed_to.state,
    invoice.billed_to.country,
  ];

  billed_lines.forEach((line) => {
    doc.text(line, PAGE_MARGIN, y_position);
    y_position += 5;
  });

  return y_position;
}

function drawInvoiceMetadata(
  doc: jsPDF,
  invoice: InvoiceDetail,
  y_position: number
): number {
  const right_x = PAGE_WIDTH - PAGE_MARGIN;
  const label_x = right_x - 70;

  const meta_fields = [
    { label: "Invoice number", value: invoice.invoice_number },
    { label: "Unique ID", value: invoice.unique_id },
    { label: "Date issued", value: invoice.date_issued },
    { label: "Date paid", value: invoice.date_paid },
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

function drawLineItemsTable(
  doc: jsPDF,
  invoice: InvoiceDetail,
  y_position: number
): number {
  const col_positions = {
    item: PAGE_MARGIN,
    price: PAGE_MARGIN + 80,
    quantity: PAGE_MARGIN + 120,
    total: PAGE_WIDTH - PAGE_MARGIN,
  };

  const row_height = 10;

  // Table header background
  doc.setFillColor(...COLORS.table_header_bg);
  doc.rect(PAGE_MARGIN, y_position - 5, CONTENT_WIDTH, row_height, "F");

  // Header border
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.rect(PAGE_MARGIN, y_position - 5, CONTENT_WIDTH, row_height, "S");

  // Header text
  doc.setFontSize(FONT_SIZES.small);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.secondary);
  doc.text("Item", col_positions.item + 4, y_position + 1);
  doc.text("Price", col_positions.price, y_position + 1);
  doc.text("Quantity", col_positions.quantity, y_position + 1);
  doc.text("Item Total", col_positions.total - 4, y_position + 1, {
    align: "right",
  });

  y_position += row_height;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZES.body);

  invoice.line_items.forEach((item) => {
    // Row border
    doc.setDrawColor(...COLORS.border);
    doc.rect(PAGE_MARGIN, y_position - 5, CONTENT_WIDTH, row_height, "S");

    doc.setTextColor(...COLORS.primary);
    doc.text(item.item_name, col_positions.item + 4, y_position + 1);

    doc.setTextColor(...COLORS.secondary);
    doc.text(item.price, col_positions.price, y_position + 1);
    doc.text(`x ${item.quantity}`, col_positions.quantity, y_position + 1);
    doc.text(item.item_total, col_positions.total - 4, y_position + 1, {
      align: "right",
    });

    y_position += row_height;
  });

  return y_position;
}

function drawSummarySection(
  doc: jsPDF,
  invoice: InvoiceDetail,
  y_position: number
): number {
  const right_x = PAGE_WIDTH - PAGE_MARGIN;
  const label_x = right_x - 60;

  y_position += 5;

  // Subtotal
  doc.setFontSize(FONT_SIZES.body);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.secondary);
  doc.text("Subtotal", label_x, y_position);
  doc.text(invoice.subtotal, right_x, y_position, { align: "right" });

  y_position += 8;

  // Separator line
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(label_x, y_position - 3, right_x, y_position - 3);

  // Total
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("Total", label_x, y_position);
  doc.text(invoice.total, right_x, y_position, { align: "right" });

  y_position += 7;

  // Credit
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

  // Company header
  y_position = drawCompanyHeader(doc, y_position);

  // Invoice title + status badge (right side)
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

  // Billed to section (left)
  const billed_start_y = y_position;
  y_position = drawBilledToSection(doc, invoice, y_position);

  // Invoice metadata (right)
  drawInvoiceMetadata(doc, invoice, billed_start_y);

  y_position += 10;

  // Line items table
  y_position = drawLineItemsTable(doc, invoice, y_position);

  // Summary
  y_position = drawSummarySection(doc, invoice, y_position);

  // Download the PDF
  const file_name = `invoice_${invoice.invoice_number}_${invoice.unique_id}.pdf`;
  doc.save(file_name);
}
