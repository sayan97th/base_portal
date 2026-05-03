import type { Role, Organization, User } from "@/types/auth";

export type {
  ReportRowStatus,
  ReportRow,
  ReportTable,
  OrderReport,
  CreateReportTablePayload,
  UpdateReportTablePayload,
  CreateReportRowPayload,
  UpdateReportRowPayload,
  SendReportPayload,
  SendReportResponse,
} from "./order-report";

export type { OrderUpdate, OrderUpdatesResponse, CreateOrderUpdatePayload, UpdateAuthor, TrackingOrderSummary, TrackingOrdersResponse } from "./order-tracking";

export type { Role, Organization };

// AdminUser is the same as User but with strongly-typed roles
export type AdminUser = Omit<User, "roles"> & {
  roles: Role[];
};

export interface Permission {
  id: number;
  name: string;
  display_name: string;
}

export interface RoleWithPermissions extends Role {
  description?: string;
  permissions: Permission[];
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

// ── Orders ────────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

export type AdminOrderProductType =
  | "link_building"
  | "new_content"
  | "content_optimization"
  | "content_brief";

export type OrderSortField =
  | "created_at"
  | "total_amount"
  | "status"
  | "order_title"
  | "customer";

export type SortDirection = "asc" | "desc";

// ── Users ─────────────────────────────────────────────────────────────────────

export type UserSortField = "first_name" | "email" | "organization" | "created_at";

export type UserRoleFilter = "super_admin" | "admin" | "staff" | "";

export interface AdminUserFilters {
  page?: number;
  search?: string;
  sort_field?: UserSortField;
  sort_direction?: SortDirection;
  date_from?: string;
  date_to?: string;
  role?: UserRoleFilter;
}

// ── Clients ───────────────────────────────────────────────────────────────────

export type ClientSortField = "first_name" | "email" | "organization" | "created_at";

export type ClientEmailStatusFilter = "verified" | "unverified" | "";

export type ClientAccountStatusFilter = "active" | "disabled" | "";

export interface AdminClientFilters {
  page?: number;
  search?: string;
  sort_field?: ClientSortField;
  sort_direction?: SortDirection;
  date_from?: string;
  date_to?: string;
  email_status?: ClientEmailStatusFilter;
  account_status?: ClientAccountStatusFilter;
}

export interface AdminOrderFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: OrderStatus | "";
  sort_field?: OrderSortField;
  sort_direction?: SortDirection;
  date_from?: string;
  date_to?: string;
  session_id?: string;
}

export interface OrderUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface OrderBilling {
  company: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface OrderItemDrTier {
  id: string;
  label: string;
  traffic_range: string;
  word_count: number;
  price_per_link: number;
}

export interface OrderPlacementDetail {
  id: string;
  row_index: number;
  keyword: string | null;
  landing_page: string | null;
  exact_match: boolean;
}

export interface NewContentIntakeRow {
  keyword_phrase: string;
  type_of_content: string;
  notes: string;
}

export interface OrderItem {
  id: number;
  dr_tier_id?: number | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  item_name?: string | null;
  dr_tier?: OrderItemDrTier;
  placements?: OrderPlacementDetail[];
  intake_rows?: NewContentIntakeRow[];
}

export interface AdminOrder {
  id: string;
  user_id: number;
  order_title: string;
  order_notes: string | null;
  subtotal_before_discount?: number;
  total_amount: number;
  status: OrderStatus;
  payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
  user: OrderUser;
  items: OrderItem[];
  billing: OrderBilling | null;
  invoice: AdminInvoice | null;
  coupons?: OrderCouponDetail[];
  session_id?: string | null;
  session_title?: string | null;
  product_type?: AdminOrderProductType;
  items_count?: number;
}

export interface AdminOrderGroup {
  group_id: string;
  session_id: string | null;
  session_title: string | null;
  created_at: string;
  total_amount: number;
  orders: AdminOrder[];
  is_multi_order: boolean;
  user: OrderUser;
}

export interface AdminLinkBuildingOrder {
  id: string;
  order_title: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  items_count: number;
  user: OrderUser;
}

export interface LinkBuildingOrderFilters {
  page?: number;
  per_page?: number;
  status?: OrderStatus;
}

// Full Laravel paginator envelope returned by the link-building orders endpoint
export interface LaravelPaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  links: { url: string | null; label: string; active: boolean }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export type InvoiceStatus = "paid" | "unpaid" | "overdue" | "refund" | "void";

export type InvoiceSortField =
  | "date_issued"
  | "total_amount"
  | "status"
  | "invoice_number"
  | "customer";

export interface AdminInvoiceFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: InvoiceStatus | "";
  sort_field?: InvoiceSortField;
  sort_direction?: SortDirection;
  date_from?: string;
  date_to?: string;
}
export type InvoiceCurrencyType = "usd" | "credits";
export type InvoicePaymentMethod = "Account Balance" | "Credit Card";
export type CouponDiscountType = "percentage" | "fixed_amount";

export interface InvoiceCouponDiscount {
  code: string;
  name: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  discount_amount: number;
}

export interface OrderCouponDetail {
  coupon_id: string;
  code: string;
  name: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  discount_amount: number;
}

export interface InvoiceBilledTo {
  company_name: string | null;
  company_description: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  state: string | null;
  country: string | null;
}

export interface InvoiceLineItem {
  id: number;
  item_name: string;
  price: number;
  quantity: number;
  item_total: number;
}

export interface InvoiceProductGroup {
  product_type: AdminOrderProductType;
  order_id: string;
  label: string;
  items: InvoiceLineItem[];
  subtotal: number;
}

export interface AdminInvoice {
  id: string;
  unique_id: string;
  invoice_number: string;
  user_id: number;
  order_id: string;
  status: InvoiceStatus;
  payment_method: InvoicePaymentMethod;
  currency_type: InvoiceCurrencyType;
  subtotal_amount: number;
  discount_amount?: number;
  discount_type?: "bulk" | "percentage" | "fixed_amount";
  total_amount: number;
  credit_amount: number;
  date_issued: string | null;
  date_due: string | null;
  date_paid: string | null;
  created_at: string;
  updated_at: string;
  user: OrderUser;
  line_items: InvoiceLineItem[];
  billed_to: InvoiceBilledTo | null;
  coupon_discounts?: InvoiceCouponDiscount[];
  session_id?: string | null;
  session_title?: string | null;
  product_type?: AdminOrderProductType | null;
  invoice_products?: InvoiceProductGroup[];
}

// ── Invoice Creation & History ────────────────────────────────────────────────

export interface CreateInvoiceLineItemPayload {
  item_name: string;
  description?: string;
  price: number;
  quantity: number;
  discount_percent?: number;
}

export interface CreateInvoicePayload {
  user_id: number;
  date_due: string;
  line_items: CreateInvoiceLineItemPayload[];
  notes?: string;
  send_client_notification: boolean;
  send_admin_notification: boolean;
  currency_type?: InvoiceCurrencyType;
}

export type InvoiceHistoryActorType = "system" | "client" | "admin";

export interface InvoiceHistoryEntry {
  id: number;
  event: string;
  description: string | null;
  actor_name: string;
  actor_initials: string;
  actor_type: InvoiceHistoryActorType;
  created_at: string;
}

// ── Invitations ───────────────────────────────────────────────────────────────

export type InvitationRole = "admin" | "staff";

export type InvitationStatus = "pending" | "expired" | "accepted";

export type InvitationSortField =
  | "email"
  | "role"
  | "status"
  | "expires_at"
  | "created_at";

export interface AdminInvitationFilters {
  page?: number;
  search?: string;
  status?: InvitationStatus | "";
  role?: InvitationRole | "";
  sort_field?: InvitationSortField;
  sort_direction?: SortDirection;
  date_from?: string;
  date_to?: string;
}

export interface InvitationInviter {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface AdminInvitation {
  id: number;
  email: string;
  role: InvitationRole;
  token: string;
  invited_by: number;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  inviter: InvitationInviter | null;
}

export interface AdminInvitationValidation {
  valid: boolean;
  invitation: AdminInvitation;
}

export interface SendAdminInvitationData {
  email: string;
  role: InvitationRole;
}

export interface AcceptAdminInvitationData {
  invitation_token: string;
  first_name: string;
  last_name: string;
  password: string;
  password_confirmation: string;
}

export interface AcceptInvitationResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: AdminUser;
}

// ── User Detail ───────────────────────────────────────────────────────────────

export interface AdminUserOrderSummary {
  id: string;
  order_title: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  items_count: number;
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export interface RolesListResponse {
  roles: RoleWithPermissions[];
}

export interface AssignRoleData {
  role: string;
}

export interface RoleActionResponse {
  message: string;
  user: AdminUser;
}
