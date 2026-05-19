"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import {
  ApiTicketMessage,
  TicketStatus,
  TicketPriority,
  status_bg_map,
  status_label_map,
  status_dot_color_map,
  priority_color_map,
  priority_dot_map,
  priority_label_map,
  formatTicketDate,
  formatMessageTime,
  getSenderInitials,
  getSenderName,
  order_options,
} from "@/components/support/supportData";
import {
  adminSupportTicketsService,
  AdminApiTicket,
  AdminTicketClientStats,
  AdminUserForSelect,
} from "@/services/admin/support-tickets.service";
import { useAuth } from "@/context/AuthContext";

interface AdminTicketDetailProps {
  ticket: AdminApiTicket;
  client_stats: AdminTicketClientStats | null;
}

const STATUS_STEPS: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];

const STATUS_ACTIONS: { status: TicketStatus; label: string; color: ActionColor }[] = [
  { status: "in_progress", label: "Mark In Progress", color: "warning" },
  { status: "resolved", label: "Mark as Resolved", color: "success" },
  { status: "closed", label: "Close Ticket", color: "danger" },
  { status: "open", label: "Reopen Ticket", color: "brand" },
];

const AdminTicketDetail: React.FC<AdminTicketDetailProps> = ({ ticket: initial_ticket, client_stats }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<AdminApiTicket>(initial_ticket);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [reply_error, setReplyError] = useState<string | null>(null);
  const [updating_status, setUpdatingStatus] = useState(false);
  const [updating_priority, setUpdatingPriority] = useState(false);
  const [show_status_modal, setShowStatusModal] = useState(false);
  const [modal_selected_status, setModalSelectedStatus] = useState<TicketStatus>(initial_ticket.status);
  const [modal_status_error, setModalStatusError] = useState<string | null>(null);
  const [show_assign_modal, setShowAssignModal] = useState(false);
  const messages_end_ref = useRef<HTMLDivElement>(null);
  const textarea_ref = useRef<HTMLTextAreaElement>(null);

  const messages = ticket.messages ?? [];
  const is_closed = ticket.status === "closed";
  const can_reply = reply.trim().length > 0 && !sending && !is_closed;
  const related_order_label =
    order_options.find((o) => o.value === ticket.related_order)?.label ?? ticket.related_order;
  const client = ticket.user;
  const client_name = client ? getSenderName(client) : "Unknown Client";
  const client_initials = client ? getSenderInitials(client) : "?";

  useEffect(() => {
    messages_end_ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const textarea = textarea_ref.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 280)}px`;
  }, [reply]);

  const handleSendReply = useCallback(async () => {
    if (!can_reply) return;
    setSending(true);
    setReplyError(null);

    try {
      const res = await adminSupportTicketsService.addMessage(ticket.id, reply.trim());
      setTicket((prev) => ({
        ...res.support_ticket,
        messages: [...(prev.messages ?? []), res.ticket_message],
      }));
      setReply("");
      if (textarea_ref.current) textarea_ref.current.style.height = "auto";
    } catch (err: unknown) {
      const api_error = err as { message?: string };
      setReplyError(api_error?.message ?? "Failed to send reply. Please try again.");
    } finally {
      setSending(false);
    }
  }, [can_reply, reply, ticket.id]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handlePriorityUpdate = useCallback(async (new_priority: TicketPriority) => {
    if (updating_priority || new_priority === ticket.priority) return;
    setUpdatingPriority(true);
    try {
      const updated = await adminSupportTicketsService.updateTicket(ticket.id, { priority: new_priority });
      setTicket((prev) => ({ ...prev, priority: updated.priority }));
    } finally {
      setUpdatingPriority(false);
    }
  }, [updating_priority, ticket.id, ticket.priority]);

  const handleStatusUpdate = useCallback(async (new_status: TicketStatus) => {
    if (updating_status || new_status === ticket.status) return;
    setUpdatingStatus(true);
    try {
      const updated = await adminSupportTicketsService.updateTicket(ticket.id, { status: new_status });
      setTicket((prev) => ({
        ...prev,
        status: updated.status,
        resolved_at: updated.resolved_at,
        closed_at: updated.closed_at,
      }));
    } finally {
      setUpdatingStatus(false);
    }
  }, [updating_status, ticket.id, ticket.status]);

  const handleAssignConfirm = useCallback((admin: AdminUserForSelect | null) => {
    setTicket((prev) => ({
      ...prev,
      assigned_to: admin?.id ?? null,
      assigned_admin: admin,
    }));
    setShowAssignModal(false);
  }, []);

  const available_status_actions = STATUS_ACTIONS.filter(
    (a) => a.status !== ticket.status
  );

  const handleOpenStatusModal = () => {
    setModalSelectedStatus(ticket.status);
    setModalStatusError(null);
    setShowStatusModal(true);
  };

  const handleCloseStatusModal = useCallback(() => {
    if (updating_status) return;
    setShowStatusModal(false);
    setModalStatusError(null);
  }, [updating_status]);

  const handleConfirmStatusChange = useCallback(async () => {
    if (modal_selected_status === ticket.status) {
      setShowStatusModal(false);
      return;
    }
    setUpdatingStatus(true);
    setModalStatusError(null);
    try {
      const updated = await adminSupportTicketsService.updateTicket(ticket.id, { status: modal_selected_status });
      setTicket((prev) => ({
        ...prev,
        status: updated.status,
        resolved_at: updated.resolved_at,
        closed_at: updated.closed_at,
      }));
      setShowStatusModal(false);
    } catch (err: unknown) {
      const api_error = err as { message?: string };
      setModalStatusError(api_error?.message ?? "Failed to update status. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  }, [modal_selected_status, ticket.id, ticket.status]);

  return (
    <div className="space-y-0">
      {/* ── Header ── */}
      <div className="flex items-start gap-3 pb-5 mb-6 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => router.push("/admin/support-tickets")}
          className="mt-0.5 flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-all shrink-0"
          aria-label="Back to tickets"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1.5">
            <span className="text-xs font-mono font-medium text-gray-400 dark:text-gray-500">
              {ticket.ticket_number}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status_bg_map[ticket.status]}`}>
              {status_label_map[ticket.status]}
            </span>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
            {ticket.subject}
          </h1>

          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Opened {formatTicketDate(ticket.created_at)}
            {ticket.related_order && ` · ${related_order_label}`}
            {` · ${messages.length} message${messages.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenStatusModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Change Status
          </button>
          <PriorityDropdown
            current={ticket.priority}
            loading={updating_priority}
            onChange={handlePriorityUpdate}
          />
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex gap-6 items-start">

        {/* ── Left: Conversation ── */}
        <div className="flex-1 min-w-0">

          {/* Thread */}
          <div className="min-h-[280px] max-h-[560px] overflow-y-auto space-y-5 pb-4 pr-1">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500">No messages yet.</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const is_admin_msg = msg.sender_id !== ticket.user_id;
                const prev_msg = messages[i - 1];
                const show_divider =
                  i === 0 ||
                  new Date(msg.created_at).toDateString() !== new Date(prev_msg.created_at).toDateString();
                return (
                  <React.Fragment key={msg.id}>
                    {show_divider && <DateDivider date={msg.created_at} />}
                    <AdminMessageBubble
                      message={msg}
                      is_admin={is_admin_msg}
                      current_user_id={user?.id ?? 0}
                    />
                  </React.Fragment>
                );
              })
            )}
            <div ref={messages_end_ref} />
          </div>

          {/* Reply area */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-5 mt-2">
            {is_closed ? (
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-5 py-6 text-center">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">This ticket is closed</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Reopen it to continue the conversation.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusUpdate("open")}
                  disabled={updating_status}
                >
                  {updating_status ? "Reopening…" : "Reopen Ticket"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    ref={textarea_ref}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your reply… press ⌘ Enter to send"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm text-gray-800 placeholder:text-gray-400 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 transition-colors"
                    style={{ minHeight: "96px" }}
                    disabled={sending}
                  />
                  {reply.length > 0 && (
                    <span className="absolute bottom-3 right-3 text-[10px] text-gray-400 dark:text-gray-500 pointer-events-none select-none tabular-nums">
                      {reply.length}
                    </span>
                  )}
                </div>

                {reply_error && (
                  <div className="flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    {reply_error}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">
                    The client will receive an email notification with your reply.
                  </p>
                  <Button
                    variant="coral"
                    size="sm"
                    onClick={handleSendReply}
                    disabled={!can_reply}
                    startIcon={
                      sending ? (
                        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      )
                    }
                  >
                    {sending ? "Sending…" : "Send Reply"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Info Sidebar ── */}
        <aside className="hidden lg:flex flex-col gap-4 w-72 shrink-0">

          {/* Assigned To Card */}
          <SidebarCard title="Assigned To">
            {ticket.assigned_admin ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-sm font-bold text-indigo-700 dark:text-indigo-300">
                    {getAdminInitials(ticket.assigned_admin)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {ticket.assigned_admin.first_name} {ticket.assigned_admin.last_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ticket.assigned_admin.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                  >
                    Reassign
                  </button>
                  <UnassignButton ticket_id={ticket.id} onUnassign={handleAssignConfirm} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 py-1">
                  <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Not assigned yet</p>
                </div>
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-brand-300 dark:border-brand-600 px-3 py-2 text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 hover:border-brand-400 dark:hover:border-brand-500 transition-all"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                  Assign to Admin
                </button>
              </div>
            )}
          </SidebarCard>

          {/* Client Card */}
          {client && (
            <SidebarCard title="Client">
              <div className="space-y-3">
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20 text-sm font-bold text-brand-700 dark:text-brand-300">
                    {client_initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{client_name}</p>
                    {client.job_title && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{client.job_title}</p>
                    )}
                  </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-800" />

                {/* Contact details */}
                <div className="space-y-2">
                  <SidebarRow label="Email">
                    <a
                      href={`mailto:${client.email}`}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline truncate max-w-[140px] block"
                    >
                      {client.email}
                    </a>
                  </SidebarRow>

                  {client.phone && (
                    <SidebarRow label="Phone">
                      <span className="text-xs text-gray-600 dark:text-gray-400">{client.phone}</span>
                    </SidebarRow>
                  )}

                  {client.organization?.name && (
                    <SidebarRow label="Company">
                      <span className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate max-w-[140px] block">{client.organization.name}</span>
                    </SidebarRow>
                  )}
                </div>

                {/* Stats */}
                {client_stats && (
                  <>
                    <div className="h-px bg-gray-100 dark:bg-gray-800" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2.5 text-center">
                        <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                          {client_stats.total_tickets}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Total Tickets</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-2.5 text-center">
                        <p className={`text-lg font-bold tabular-nums ${client_stats.open_tickets > 0 ? "text-brand-600 dark:text-brand-400" : "text-gray-900 dark:text-white"}`}>
                          {client_stats.open_tickets}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Open</p>
                      </div>
                    </div>
                    {client_stats.member_since && (
                      <SidebarRow label="Member since">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTicketDate(client_stats.member_since)}
                        </span>
                      </SidebarRow>
                    )}
                  </>
                )}
              </div>
            </SidebarCard>
          )}

          {/* Ticket Progress */}
          <SidebarCard title="Progress">
            <ol className="space-y-0">
              {STATUS_STEPS.map((step, i) => {
                const is_active = step === ticket.status;
                const is_done = STATUS_STEPS.indexOf(ticket.status) > i;
                const is_last = i === STATUS_STEPS.length - 1;
                return (
                  <li key={step} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all ${is_active
                            ? `ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-gray-900/50 ring-current ${status_dot_color_map[step]}`
                            : is_done
                              ? status_dot_color_map[step]
                              : "bg-gray-200 dark:bg-gray-700"
                          }`}
                      >
                        {is_done ? (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <span className={`h-2 w-2 rounded-full ${is_active ? "bg-white" : "bg-gray-400 dark:bg-gray-500"}`} />
                        )}
                      </div>
                      {!is_last && (
                        <div className={`w-0.5 h-5 my-0.5 ${is_done ? "bg-success-400 dark:bg-success-500" : "bg-gray-200 dark:bg-gray-700"}`} />
                      )}
                    </div>
                    <div className="pb-5 pt-0.5">
                      <span className={`text-xs leading-none font-medium ${is_active ? "text-gray-900 dark:text-white" : is_done ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-400 dark:text-gray-600"
                        }`}>
                        {status_label_map[step]}
                      </span>
                      {is_active && step === "resolved" && ticket.resolved_at && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{formatTicketDate(ticket.resolved_at)}</p>
                      )}
                      {is_active && step === "closed" && ticket.closed_at && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{formatTicketDate(ticket.closed_at)}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </SidebarCard>

          {/* Ticket Details */}
          <SidebarCard title="Details">
            <div className="space-y-3">
              {ticket.related_order && (
                <SidebarRow label="Service">
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">{related_order_label}</span>
                </SidebarRow>
              )}
              <SidebarRow label="Opened">
                <span className="text-xs text-gray-600 dark:text-gray-400">{formatTicketDate(ticket.created_at)}</span>
              </SidebarRow>
              {ticket.resolved_at && (
                <SidebarRow label="Resolved">
                  <span className="text-xs text-gray-600 dark:text-gray-400">{formatTicketDate(ticket.resolved_at)}</span>
                </SidebarRow>
              )}
              {ticket.closed_at && (
                <SidebarRow label="Closed">
                  <span className="text-xs text-gray-600 dark:text-gray-400">{formatTicketDate(ticket.closed_at)}</span>
                </SidebarRow>
              )}
              <SidebarRow label="Messages">
                <span className="text-xs text-gray-600 dark:text-gray-400 tabular-nums">{messages.length}</span>
              </SidebarRow>
            </div>
          </SidebarCard>

          {/* Actions */}
          <SidebarCard title="Actions">
            <div className="space-y-2">
              {available_status_actions.map((action) => (
                <SidebarAction
                  key={action.status}
                  label={action.label}
                  color={action.color}
                  loading={updating_status}
                  onClick={() => handleStatusUpdate(action.status)}
                  icon={getActionIcon(action.status)}
                />
              ))}
            </div>
          </SidebarCard>

        </aside>
      </div>

      {show_status_modal && (
        <ChangeStatusModal
          current_status={ticket.status}
          selected_status={modal_selected_status}
          loading={updating_status}
          error={modal_status_error}
          onSelect={setModalSelectedStatus}
          onConfirm={handleConfirmStatusChange}
          onClose={handleCloseStatusModal}
        />
      )}

      {show_assign_modal && (
        <AssignAdminModal
          ticket_id={ticket.id}
          current_assigned_id={ticket.assigned_to}
          onConfirm={handleAssignConfirm}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function getAdminInitials(admin: AdminUserForSelect): string {
  return (
    (admin.first_name?.[0] ?? "") + (admin.last_name?.[0] ?? "")
  ).toUpperCase();
}

function UnassignButton({
  ticket_id,
  onUnassign,
}: {
  ticket_id: number;
  onUnassign: (admin: null) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleUnassign = async () => {
    setLoading(true);
    try {
      await adminSupportTicketsService.assignTicket(ticket_id, null);
      onUnassign(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUnassign}
      disabled={loading}
      className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-500/10 hover:border-error-200 dark:hover:border-error-500/30 transition-all disabled:opacity-50"
    >
      {loading ? (
        <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : "Remove"}
    </button>
  );
}

function AssignAdminModal({
  ticket_id,
  current_assigned_id,
  onConfirm,
  onClose,
}: {
  ticket_id: number;
  current_assigned_id: number | null;
  onConfirm: (admin: AdminUserForSelect | null) => void;
  onClose: () => void;
}) {
  const [admins, setAdmins] = useState<AdminUserForSelect[]>([]);
  const [loading_admins, setLoadingAdmins] = useState(true);
  const [search, setSearch] = useState("");
  const [selected_id, setSelectedId] = useState<number | null>(current_assigned_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [saving, onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoadingAdmins(true);
    adminSupportTicketsService.getAdminUsersForSelect(search || undefined).then((data) => {
      if (!cancelled) {
        setAdmins(data);
        setLoadingAdmins(false);
      }
    }).catch(() => {
      if (!cancelled) setLoadingAdmins(false);
    });
    return () => { cancelled = true; };
  }, [search]);

  const filtered_admins = search
    ? admins.filter((a) => {
      const q = search.toLowerCase();
      return (
        a.first_name.toLowerCase().includes(q) ||
        a.last_name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
      );
    })
    : admins;

  const handle_confirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await adminSupportTicketsService.assignTicket(ticket_id, selected_id);
      const assigned = selected_id ? admins.find((a) => a.id === selected_id) ?? null : null;
      onConfirm(assigned);
    } catch (err: unknown) {
      const api_error = err as { message?: string };
      setError(api_error?.message ?? "Failed to assign admin. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const has_changed = selected_id !== current_assigned_id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Assign Ticket</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Select an admin to handle this ticket</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-9 pr-4 py-2 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-300 dark:focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/10 transition-colors"
            />
          </div>
        </div>

        {/* Admin list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
          {/* Unassign option */}
          <button
            onClick={() => setSelectedId(null)}
            disabled={saving}
            className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all disabled:opacity-60 ${selected_id === null
                ? "border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
          >
            <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Unassigned</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Remove current assignment</p>
            </div>
            {selected_id === null && (
              <div className="h-4 w-4 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </button>

          {loading_admins ? (
            <div className="py-8 flex justify-center">
              <svg className="animate-spin text-brand-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          ) : filtered_admins.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">No admins found</p>
            </div>
          ) : (
            filtered_admins.map((admin) => {
              const is_selected = selected_id === admin.id;
              const is_current = current_assigned_id === admin.id;
              return (
                <button
                  key={admin.id}
                  onClick={() => setSelectedId(admin.id)}
                  disabled={saving}
                  className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all disabled:opacity-60 ${is_selected
                      ? "border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                >
                  <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    {getAdminInitials(admin)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {admin.first_name} {admin.last_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{admin.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {is_current && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Current</span>
                    )}
                    {is_selected && (
                      <div className="h-4 w-4 rounded-full bg-brand-500 flex items-center justify-center">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-3 flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400 shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handle_confirm}
            disabled={saving || !has_changed}
            className="rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {saving && (
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            {saving ? "Assigning…" : "Confirm Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminMessageBubble({
  message,
  is_admin,
  current_user_id,
}: {
  message: ApiTicketMessage;
  is_admin: boolean;
  current_user_id: number;
}) {
  const initials = getSenderInitials(message.sender);
  const full_name = getSenderName(message.sender);
  const time = formatMessageTime(message.created_at);
  const is_own = message.sender_id === current_user_id;
  const has_html = /<[a-z][\s\S]*>/i.test(message.content);

  return (
    <div className={`flex gap-3 ${is_admin ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ${is_admin ? "bg-brand-500" : "bg-gray-400 dark:bg-gray-600"
          }`}
        title={full_name}
      >
        {initials}
      </div>

      <div className={`max-w-[78%] flex flex-col gap-1 ${is_admin ? "items-end" : "items-start"}`}>
        <div className={`flex items-center gap-1.5 ${is_admin ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {is_own ? "You" : full_name}
          </span>
          {is_admin && (
            <span className="inline-flex items-center rounded-full bg-brand-50 dark:bg-brand-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              Staff
            </span>
          )}
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{time}</span>
        </div>

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${is_admin
              ? "rounded-tr-sm bg-brand-500 text-white"
              : "rounded-tl-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90"
            } ${!has_html ? "whitespace-pre-wrap" : ""}`}
          {...(has_html
            ? { dangerouslySetInnerHTML: { __html: message.content } }
            : { children: message.content }
          )}
        />
      </div>
    </div>
  );
}

function DateDivider({ date }: { date: string }) {
  const label = new Date(date).toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium shrink-0">{label}</span>
      <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/2 p-4">
      <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function SidebarRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      <div className="flex justify-end min-w-0">{children}</div>
    </div>
  );
}

type ActionColor = "success" | "warning" | "danger" | "brand";

const action_color_classes: Record<ActionColor, string> = {
  success: "text-success-700 border-success-200 hover:bg-success-50 dark:text-success-400 dark:border-success-500/20 dark:hover:bg-success-500/10",
  warning: "text-warning-700 border-warning-200 hover:bg-warning-50 dark:text-warning-400 dark:border-warning-500/20 dark:hover:bg-warning-500/10",
  danger: "text-error-700 border-error-200 hover:bg-error-50 dark:text-error-400 dark:border-error-500/20 dark:hover:bg-error-500/10",
  brand: "text-brand-700 border-brand-200 hover:bg-brand-50 dark:text-brand-400 dark:border-brand-500/20 dark:hover:bg-brand-500/10",
};

function SidebarAction({
  label, icon, onClick, loading, color,
}: {
  label: string; icon: React.ReactNode; onClick: () => void; loading: boolean; color: ActionColor;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${action_color_classes[color]}`}
    >
      {loading ? (
        <svg className="animate-spin shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      ) : (
        <span className="shrink-0">{icon}</span>
      )}
      {loading ? "Updating…" : label}
    </button>
  );
}

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const priority_active_classes: Record<TicketPriority, string> = {
  low: "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-500/15 dark:border-blue-500/30 dark:text-blue-400",
  medium: "bg-warning-50 border-warning-300 text-warning-700 dark:bg-warning-500/15 dark:border-warning-500/30 dark:text-warning-400",
  high: "bg-error-50 border-error-300 text-error-700 dark:bg-error-500/15 dark:border-error-500/30 dark:text-error-400",
};

function PriorityDropdown({
  current,
  loading,
  onChange,
}: {
  current: TicketPriority;
  loading: boolean;
  onChange: (p: TicketPriority) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${priority_color_map[current]}`}
      >
        {loading ? (
          <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <span className={`h-1.5 w-1.5 rounded-full ${priority_dot_map[current]}`} />
        )}
        {priority_label_map[current]}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[130px] rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900 py-1 overflow-hidden">
          {PRIORITY_OPTIONS.map(({ value, label }) => {
            const is_active = value === current;
            return (
              <button
                key={value}
                onClick={() => { onChange(value); setOpen(false); }}
                disabled={is_active}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors disabled:cursor-default ${is_active
                    ? priority_active_classes[value]
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${priority_dot_map[value]}`} />
                {label}
                {is_active && (
                  <svg className="ml-auto" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getActionIcon(status: TicketStatus): React.ReactNode {
  if (status === "in_progress") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
  if (status === "resolved") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
  if (status === "closed") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.02" />
    </svg>
  );
}

const STATUS_MODAL_OPTIONS: { status: TicketStatus; description: string }[] = [
  { status: "open", description: "Ticket is open and awaiting a response" },
  { status: "in_progress", description: "Ticket is actively being worked on" },
  { status: "resolved", description: "The issue has been resolved successfully" },
  { status: "closed", description: "Ticket is closed and no further action is needed" },
];

function ChangeStatusModal({
  current_status,
  selected_status,
  loading,
  error,
  onSelect,
  onConfirm,
  onClose,
}: {
  current_status: TicketStatus;
  selected_status: TicketStatus;
  loading: boolean;
  error: string | null;
  onSelect: (status: TicketStatus) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const has_changed = selected_status !== current_status;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [loading, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Change Ticket Status</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Select the new status for this ticket</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Status options */}
        <div className="p-5 space-y-2">
          {STATUS_MODAL_OPTIONS.map(({ status, description }) => {
            const is_selected = selected_status === status;
            const is_current = current_status === status;
            return (
              <button
                key={status}
                onClick={() => onSelect(status)}
                disabled={loading}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed ${is_selected
                    ? "border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
              >
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${status_bg_map[status]}`}>
                  {status_label_map[status]}
                </span>
                <p className="flex-1 min-w-0 text-xs text-gray-600 dark:text-gray-400">{description}</p>
                <div className="flex items-center gap-2 shrink-0">
                  {is_current && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Current</span>
                  )}
                  {is_selected && (
                    <div className="h-4 w-4 rounded-full bg-brand-500 flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-5 mb-4 flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !has_changed}
            className="rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            {loading ? "Updating…" : "Confirm Change"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminTicketDetail;
