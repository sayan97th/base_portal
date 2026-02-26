export type CallStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export type CallType = "discovery" | "strategy" | "review" | "support";

export interface ScheduledCall {
  id: string;
  contact_name: string;
  contact_email: string;
  call_type: CallType;
  scheduled_date: string;
  scheduled_time: string;
  duration: string;
  status: CallStatus;
  notes: string;
}

export const status_color_map: Record<
  CallStatus,
  "primary" | "success" | "error" | "warning"
> = {
  scheduled: "primary",
  completed: "success",
  cancelled: "error",
  no_show: "warning",
};

export const status_label_map: Record<CallStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export const status_dot_color_map: Record<CallStatus, string> = {
  scheduled: "bg-brand-500",
  completed: "bg-success-500",
  cancelled: "bg-error-500",
  no_show: "bg-warning-500",
};

export const call_type_label_map: Record<CallType, string> = {
  discovery: "Discovery",
  strategy: "Strategy",
  review: "Review",
  support: "Support",
};

export const call_type_color_map: Record<
  CallType,
  "info" | "primary" | "warning" | "success"
> = {
  discovery: "info",
  strategy: "primary",
  review: "warning",
  support: "success",
};

export type CallFilterTab = "all" | "scheduled" | "completed" | "cancelled";

export const filter_tabs: { value: CallFilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const call_type_options = [
  { value: "discovery", label: "Discovery Call" },
  { value: "strategy", label: "Strategy Session" },
  { value: "review", label: "Performance Review" },
  { value: "support", label: "Support Call" },
];

export const duration_options = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "45", label: "45 minutes" },
  { value: "60", label: "60 minutes" },
];

export const scheduled_calls_list: ScheduledCall[] = [
  {
    id: "CALL-001",
    contact_name: "Sarah Johnson",
    contact_email: "sarah.johnson@example.com",
    call_type: "discovery",
    scheduled_date: "Mar 5, 2026",
    scheduled_time: "10:00 AM",
    duration: "30",
    status: "scheduled",
    notes: "Initial discovery call to discuss SEO goals and current performance.",
  },
  {
    id: "CALL-002",
    contact_name: "Michael Chen",
    contact_email: "m.chen@example.com",
    call_type: "strategy",
    scheduled_date: "Mar 3, 2026",
    scheduled_time: "2:30 PM",
    duration: "60",
    status: "scheduled",
    notes: "Q2 content strategy planning session.",
  },
  {
    id: "CALL-003",
    contact_name: "Emily Davis",
    contact_email: "emily.d@example.com",
    call_type: "review",
    scheduled_date: "Feb 28, 2026",
    scheduled_time: "11:00 AM",
    duration: "45",
    status: "completed",
    notes: "Monthly performance review for link building campaign.",
  },
  {
    id: "CALL-004",
    contact_name: "James Wilson",
    contact_email: "j.wilson@example.com",
    call_type: "support",
    scheduled_date: "Feb 25, 2026",
    scheduled_time: "3:00 PM",
    duration: "15",
    status: "cancelled",
    notes: "Client requested reschedule due to conflict.",
  },
  {
    id: "CALL-005",
    contact_name: "Lisa Martinez",
    contact_email: "lisa.m@example.com",
    call_type: "discovery",
    scheduled_date: "Feb 20, 2026",
    scheduled_time: "9:00 AM",
    duration: "30",
    status: "no_show",
    notes: "Follow-up email sent after missed call.",
  },
];
