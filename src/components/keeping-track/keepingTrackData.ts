export type TrackingStatus = "pending" | "confirmed" | "completed" | "missed" | "rescheduled";

export type CallPriority = "low" | "medium" | "high" | "urgent";

export interface CallRecord {
  id: string;
  contact_name: string;
  contact_email: string;
  call_type: string;
  scheduled_date: string;
  scheduled_time: string;
  duration: string;
  status: TrackingStatus;
  priority: CallPriority;
  assigned_to: string;
  follow_up_notes: string;
  outcome: string;
  next_action: string;
  next_action_date: string;
}

export const status_color_map: Record<
  TrackingStatus,
  "primary" | "success" | "error" | "warning" | "info"
> = {
  pending: "warning",
  confirmed: "primary",
  completed: "success",
  missed: "error",
  rescheduled: "info",
};

export const status_label_map: Record<TrackingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  missed: "Missed",
  rescheduled: "Rescheduled",
};

export const status_dot_color_map: Record<TrackingStatus, string> = {
  pending: "bg-warning-500",
  confirmed: "bg-brand-500",
  completed: "bg-success-500",
  missed: "bg-error-500",
  rescheduled: "bg-blue-light-500",
};

export const priority_color_map: Record<
  CallPriority,
  "light" | "warning" | "primary" | "error"
> = {
  low: "light",
  medium: "warning",
  high: "primary",
  urgent: "error",
};

export const priority_label_map: Record<CallPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export type TrackingFilterTab = "all" | "pending" | "confirmed" | "completed" | "missed";

export const filter_tabs: { value: TrackingFilterTab; label: string }[] = [
  { value: "all", label: "All Records" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
];

export const call_records_list: CallRecord[] = [
  {
    id: "TRK-001",
    contact_name: "Sarah Johnson",
    contact_email: "sarah.johnson@example.com",
    call_type: "Discovery",
    scheduled_date: "Mar 5, 2026",
    scheduled_time: "10:00 AM",
    duration: "30",
    status: "confirmed",
    priority: "high",
    assigned_to: "Alex Rivera",
    follow_up_notes: "Client interested in comprehensive SEO audit. Prepare competitor analysis before the call.",
    outcome: "",
    next_action: "Send pre-call questionnaire",
    next_action_date: "Mar 3, 2026",
  },
  {
    id: "TRK-002",
    contact_name: "Michael Chen",
    contact_email: "m.chen@example.com",
    call_type: "Strategy",
    scheduled_date: "Mar 3, 2026",
    scheduled_time: "2:30 PM",
    duration: "60",
    status: "pending",
    priority: "urgent",
    assigned_to: "Jordan Blake",
    follow_up_notes: "Q2 planning session. Review current KPIs and prepare growth projections.",
    outcome: "",
    next_action: "Prepare Q2 roadmap draft",
    next_action_date: "Mar 1, 2026",
  },
  {
    id: "TRK-003",
    contact_name: "Emily Davis",
    contact_email: "emily.d@example.com",
    call_type: "Review",
    scheduled_date: "Feb 28, 2026",
    scheduled_time: "11:00 AM",
    duration: "45",
    status: "completed",
    priority: "medium",
    assigned_to: "Alex Rivera",
    follow_up_notes: "Monthly performance review for link building campaign.",
    outcome: "Client satisfied with progress. Approved budget increase for Q2.",
    next_action: "Send updated proposal",
    next_action_date: "Mar 5, 2026",
  },
  {
    id: "TRK-004",
    contact_name: "James Wilson",
    contact_email: "j.wilson@example.com",
    call_type: "Support",
    scheduled_date: "Feb 25, 2026",
    scheduled_time: "3:00 PM",
    duration: "15",
    status: "missed",
    priority: "medium",
    assigned_to: "Taylor Kim",
    follow_up_notes: "Client did not join. Attempted callback with no answer.",
    outcome: "No show - rescheduling required.",
    next_action: "Send reschedule email",
    next_action_date: "Feb 26, 2026",
  },
  {
    id: "TRK-005",
    contact_name: "Lisa Martinez",
    contact_email: "lisa.m@example.com",
    call_type: "Discovery",
    scheduled_date: "Feb 20, 2026",
    scheduled_time: "9:00 AM",
    duration: "30",
    status: "completed",
    priority: "low",
    assigned_to: "Jordan Blake",
    follow_up_notes: "Initial discovery call to understand client needs for content marketing.",
    outcome: "Client wants to proceed with content strategy package.",
    next_action: "Draft service agreement",
    next_action_date: "Feb 25, 2026",
  },
  {
    id: "TRK-006",
    contact_name: "David Park",
    contact_email: "d.park@example.com",
    call_type: "Strategy",
    scheduled_date: "Mar 7, 2026",
    scheduled_time: "1:00 PM",
    duration: "45",
    status: "confirmed",
    priority: "high",
    assigned_to: "Alex Rivera",
    follow_up_notes: "Discuss new keyword targeting strategy and content calendar for Q2.",
    outcome: "",
    next_action: "Prepare keyword research report",
    next_action_date: "Mar 5, 2026",
  },
  {
    id: "TRK-007",
    contact_name: "Rachel Green",
    contact_email: "r.green@example.com",
    call_type: "Review",
    scheduled_date: "Mar 10, 2026",
    scheduled_time: "4:00 PM",
    duration: "30",
    status: "pending",
    priority: "medium",
    assigned_to: "Taylor Kim",
    follow_up_notes: "Quarterly review of PR campaigns performance metrics.",
    outcome: "",
    next_action: "Compile performance dashboard",
    next_action_date: "Mar 8, 2026",
  },
  {
    id: "TRK-008",
    contact_name: "Tom Bradley",
    contact_email: "t.bradley@example.com",
    call_type: "Support",
    scheduled_date: "Feb 18, 2026",
    scheduled_time: "10:30 AM",
    duration: "20",
    status: "rescheduled",
    priority: "low",
    assigned_to: "Jordan Blake",
    follow_up_notes: "Client requested reschedule to next week due to travel.",
    outcome: "Rescheduled to Feb 26.",
    next_action: "Confirm new date with client",
    next_action_date: "Feb 24, 2026",
  },
];
