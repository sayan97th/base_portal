export type ReportRowStatus = "pending" | "live" | "rejected";

export interface ReportRow {
  id: string;
  order_number: string;
  link_type: string;
  keyword: string;
  landing_page: string;
  exact_match: boolean;
  request_date: string;
  status: ReportRowStatus;
  live_link: string | null;
  live_link_date: string | null;
  dr: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReportTable {
  id: string;
  title: string;
  description: string | null;
  rows: ReportRow[];
  created_at: string;
  updated_at: string;
}

export interface OrderReport {
  id: string;
  order_id: string;
  tables: ReportTable[];
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReportTablePayload {
  title: string;
  description?: string;
}

export interface UpdateReportTablePayload {
  title?: string;
  description?: string;
}

export interface CreateReportRowPayload {
  order_number: string;
  link_type: string;
  keyword: string;
  landing_page: string;
  exact_match: boolean;
  request_date: string;
  status: ReportRowStatus;
  live_link?: string;
  live_link_date?: string;
  dr?: number;
}

export interface UpdateReportRowPayload extends Partial<CreateReportRowPayload> {}

export interface SendReportPayload {
  message?: string;
}

export interface SendReportResponse {
  message: string;
  sent_at: string;
}

export interface ImportOrderItemsPayload {
  placement_ids: string[];
}

export interface ImportOrderItemsResponse {
  message: string;
  imported_count: number;
  report: OrderReport;
}
