import type { Role, Organization, User } from "@/types/auth";

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

export interface OrderItem {
  id: number;
  dr_tier_id: number;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface AdminOrder {
  id: string;
  user_id: number;
  order_title: string;
  order_notes: string | null;
  total_amount: number;
  status: OrderStatus;
  payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
  user: OrderUser;
  items: OrderItem[];
  billing: OrderBilling | null;
  invoice: AdminInvoice | null;
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

export type InvoiceStatus = "paid" | "void";
export type InvoiceCurrencyType = "usd" | "credits";
export type InvoicePaymentMethod = "Account Balance" | "Credit Card";

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
}

// ── Invitations ───────────────────────────────────────────────────────────────

export type InvitationRole = "admin" | "staff";

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
