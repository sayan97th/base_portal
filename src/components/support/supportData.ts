export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type TicketPriority = "low" | "medium" | "high";

export interface TicketMessage {
  id: string;
  content: string;
  sender: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  subject: string;
  created_at: string;
  status: TicketStatus;
  priority: TicketPriority;
  related_order: string;
  messages: TicketMessage[];
}

export const status_color_map: Record<
  TicketStatus,
  "primary" | "warning" | "success" | "info"
> = {
  open: "primary",
  in_progress: "warning",
  resolved: "success",
  closed: "info",
};

export const status_label_map: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const status_dot_color_map: Record<TicketStatus, string> = {
  open: "bg-brand-500",
  in_progress: "bg-warning-500",
  resolved: "bg-success-500",
  closed: "bg-blue-light-500",
};

export const order_options = [
  { value: "ord_001", label: "ORD-001 - Link Building Campaign" },
  { value: "ord_002", label: "ORD-002 - Content Refresh Package" },
  { value: "ord_003", label: "ORD-003 - SEO Growth Plan" },
  { value: "ord_004", label: "ORD-004 - PR Campaign" },
];

export const ticket_list: Ticket[] = [];

export type TicketFilterTab = "all" | "open" | "resolved" | "closed";

export const filter_tabs: { value: TicketFilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];
