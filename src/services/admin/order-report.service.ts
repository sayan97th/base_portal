import { apiClient } from "@/lib/api-client";
import type {
  OrderReport,
  ReportTable,
  ReportRow,
  CreateReportTablePayload,
  UpdateReportTablePayload,
  CreateReportRowPayload,
  UpdateReportRowPayload,
  SendReportPayload,
  SendReportResponse,
  ImportOrderItemsPayload,
  ImportOrderItemsResponse,
} from "@/types/admin/order-report";

/**
 * Fetch the full report for an order (all tables + rows).
 */
export async function getOrderReport(order_id: string): Promise<OrderReport> {
  return apiClient.get<OrderReport>(`/api/admin/orders/${order_id}/report`);
}

/**
 * Create a new table inside an order report.
 */
export async function createReportTable(
  order_id: string,
  payload: CreateReportTablePayload
): Promise<ReportTable> {
  return apiClient.post<ReportTable>(
    `/api/admin/orders/${order_id}/report/tables`,
    payload
  );
}

/**
 * Update a report table's metadata (title / description).
 */
export async function updateReportTable(
  order_id: string,
  table_id: string,
  payload: UpdateReportTablePayload
): Promise<ReportTable> {
  return apiClient.patch<ReportTable>(
    `/api/admin/orders/${order_id}/report/tables/${table_id}`,
    payload
  );
}

/**
 * Delete a report table and all its rows.
 */
export async function deleteReportTable(
  order_id: string,
  table_id: string
): Promise<void> {
  return apiClient.delete<void>(
    `/api/admin/orders/${order_id}/report/tables/${table_id}`
  );
}

/**
 * Add a new row to a report table.
 */
export async function addReportRow(
  order_id: string,
  table_id: string,
  payload: CreateReportRowPayload
): Promise<ReportRow> {
  return apiClient.post<ReportRow>(
    `/api/admin/orders/${order_id}/report/tables/${table_id}/rows`,
    payload
  );
}

/**
 * Update an existing row in a report table.
 */
export async function updateReportRow(
  order_id: string,
  table_id: string,
  row_id: string,
  payload: UpdateReportRowPayload
): Promise<ReportRow> {
  return apiClient.patch<ReportRow>(
    `/api/admin/orders/${order_id}/report/tables/${table_id}/rows/${row_id}`,
    payload
  );
}

/**
 * Delete a row from a report table.
 */
export async function deleteReportRow(
  order_id: string,
  table_id: string,
  row_id: string
): Promise<void> {
  return apiClient.delete<void>(
    `/api/admin/orders/${order_id}/report/tables/${table_id}/rows/${row_id}`
  );
}

/**
 * Import (createOrUpdate) report tables and rows from the original order items.
 * Sends the IDs of the order items to sync. Returns the updated full report.
 * Roles allowed: super_admin, admin, staff.
 */
export async function importOrderItems(
  order_id: string,
  payload: ImportOrderItemsPayload
): Promise<ImportOrderItemsResponse> {
  return apiClient.post<ImportOrderItemsResponse>(
    `/api/admin/orders/${order_id}/report/import`,
    payload
  );
}

/**
 * Send the completed report to the client via email.
 */
export async function sendOrderReport(
  order_id: string,
  payload?: SendReportPayload
): Promise<SendReportResponse> {
  return apiClient.post<SendReportResponse>(
    `/api/admin/orders/${order_id}/report/send`,
    payload ?? {}
  );
}
