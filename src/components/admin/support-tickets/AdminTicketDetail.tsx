"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import {
  ApiTicketMessage,
  TicketStatus,
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
} from "@/services/admin/support-tickets.service";
import { useAuth } from "@/context/AuthContext";

interface AdminTicketDetailProps {
  ticket: AdminApiTicket;
  client_stats: AdminTicketClientStats | null;
}

const STATUS_STEPS: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];

const STATUS_ACTIONS: { status: TicketStatus; label: string; color: ActionColor }[] = [
  { status: "in_progress", label: "Mark In Progress", color: "warning" },
  { status: "resolved",    label: "Mark as Resolved", color: "success" },
  { status: "closed",      label: "Close Ticket",     color: "danger" },
  { status: "open",        label: "Reopen Ticket",    color: "brand" },
];

const AdminTicketDetail: React.FC<AdminTicketDetailProps> = ({ ticket: initial_ticket, client_stats }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<AdminApiTicket>(initial_ticket);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [reply_error, setReplyError] = useState<string | null>(null);
  const [updating_status, setUpdatingStatus] = useState(false);
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

  const handleStatusUpdate = useCallback(async (new_status: TicketStatus) => {
    if (updating_status || new_status === ticket.status) return;
    setUpdatingStatus(true);
    try {
      const updated = await adminSupportTicketsService.updateTicket(ticket.id, { status: new_status });
      setTicket((prev) => ({
        ...prev,
        status:      updated.status,
        resolved_at: updated.resolved_at,
        closed_at:   updated.closed_at,
      }));
    } finally {
      setUpdatingStatus(false);
    }
  }, [updating_status, ticket.id, ticket.status]);

  const available_status_actions = STATUS_ACTIONS.filter(
    (a) => a.status !== ticket.status
  );

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
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${priority_color_map[ticket.priority]}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${priority_dot_map[ticket.priority]}`} />
              {priority_label_map[ticket.priority]}
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
                const is_done   = STATUS_STEPS.indexOf(ticket.status) > i;
                const is_last   = i === STATUS_STEPS.length - 1;
                return (
                  <li key={step} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          is_active
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
                      <span className={`text-xs leading-none font-medium ${
                        is_active ? "text-gray-900 dark:text-white" : is_done ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-400 dark:text-gray-600"
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
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function AdminMessageBubble({
  message,
  is_admin,
  current_user_id,
}: {
  message: ApiTicketMessage;
  is_admin: boolean;
  current_user_id: number;
}) {
  const initials  = getSenderInitials(message.sender);
  const full_name = getSenderName(message.sender);
  const time      = formatMessageTime(message.created_at);
  const is_own    = message.sender_id === current_user_id;
  const has_html  = /<[a-z][\s\S]*>/i.test(message.content);

  return (
    <div className={`flex gap-3 ${is_admin ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ${
          is_admin ? "bg-brand-500" : "bg-gray-400 dark:bg-gray-600"
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
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            is_admin
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
  danger:  "text-error-700 border-error-200 hover:bg-error-50 dark:text-error-400 dark:border-error-500/20 dark:hover:bg-error-500/10",
  brand:   "text-brand-700 border-brand-200 hover:bg-brand-50 dark:text-brand-400 dark:border-brand-500/20 dark:hover:bg-brand-500/10",
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

export default AdminTicketDetail;
