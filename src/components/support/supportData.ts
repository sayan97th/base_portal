export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type TicketPriority = "low" | "medium" | "high";

export interface ApiTicketSender {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface ApiTicketMessage {
  id: number;
  ticket_id: number;
  sender_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  sender: ApiTicketSender;
}

export interface ApiTicket {
  id: number;
  ticket_number: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  related_order: string | null;
  user_id: number;
  closed_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  messages_count?: number;
  messages?: ApiTicketMessage[];
  user?: ApiTicketSender;
}

export type TicketFilterTab = "all" | "open" | "in_progress" | "resolved" | "closed";

export const filter_tabs: { value: TicketFilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export const status_color_map: Record<TicketStatus, "primary" | "warning" | "success" | "info"> = {
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

export const status_bg_map: Record<TicketStatus, string> = {
  open: "bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/20",
  in_progress: "bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-500/10 dark:text-warning-400 dark:border-warning-500/20",
  resolved: "bg-success-50 text-success-700 border border-success-200 dark:bg-success-500/10 dark:text-success-400 dark:border-success-500/20",
  closed: "bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
};

export const priority_color_map: Record<TicketPriority, string> = {
  low: "text-blue-600 bg-blue-50 border border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20",
  medium: "text-warning-600 bg-warning-50 border border-warning-200 dark:text-warning-400 dark:bg-warning-500/10 dark:border-warning-500/20",
  high: "text-error-600 bg-error-50 border border-error-200 dark:text-error-400 dark:bg-error-500/10 dark:border-error-500/20",
};

export const priority_dot_map: Record<TicketPriority, string> = {
  low: "bg-blue-500",
  medium: "bg-warning-500",
  high: "bg-error-500",
};

export const priority_label_map: Record<TicketPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const order_options = [
  { value: "link_building", label: "Link Building" },
  { value: "premium_mentions", label: "Premium Mentions" },
  { value: "new_content", label: "New Content" },
  { value: "content_refresh", label: "Content Refresh" },
  { value: "sme_content", label: "SME Content" },
  { value: "seo_packages", label: "SEO Packages" },
  { value: "pr_campaign", label: "PR Campaign" },
];

export const order_label_map: Record<string, string> = Object.fromEntries(
  order_options.map(({ value, label }) => [value, label])
);

export function formatTicketDate(date_string: string): string {
  return new Date(date_string).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function timeAgo(date_string: string): string {
  const now = new Date();
  const date = new Date(date_string);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return formatTicketDate(date_string);
}

export function formatMessageTime(date_string: string): string {
  return new Date(date_string).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getSenderName(sender: ApiTicketSender): string {
  return `${sender.first_name} ${sender.last_name}`.trim();
}

export function getSenderInitials(sender: ApiTicketSender): string {
  const first = sender.first_name?.charAt(0) ?? "";
  const last = sender.last_name?.charAt(0) ?? "";
  return `${first}${last}`.toUpperCase();
}
