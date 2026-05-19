"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import RichTextEditor from "./RichTextEditor";
import {
  ApiTicket,
  ApiTicketMessage,
  TicketStatus,
  status_bg_map,
  status_label_map,
  priority_color_map,
  priority_dot_map,
  priority_label_map,
  formatTicketDate,
  formatMessageTime,
  getSenderInitials,
  getSenderName,
} from "./supportData";
import { supportTicketsService } from "@/services/client/support-tickets.service";

interface TicketDetailProps {
  ticket: ApiTicket;
  current_user_id: number;
}

const CLOSE_STATUSES: { value: TicketStatus; label: string }[] = [
  { value: "open", label: "Reopen Ticket" },
  { value: "resolved", label: "Mark as Resolved" },
  { value: "closed", label: "Close Ticket" },
];

const TicketDetail: React.FC<TicketDetailProps> = ({ ticket: initial_ticket, current_user_id }) => {
  const router = useRouter();
  const [ticket, setTicket] = useState<ApiTicket>(initial_ticket);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [reply_error, setReplyError] = useState<string | null>(null);
  const [updating_status, setUpdatingStatus] = useState(false);
  const [editor_key, setEditorKey] = useState(0);
  const messages_end_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messages_end_ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket.messages?.length]);

  const is_closed = ticket.status === "closed";
  const reply_text = reply.replace(/<[^>]*>/g, "").trim();
  const can_reply = reply_text.length > 0 && !sending && !is_closed;

  const handleSendReply = async () => {
    if (!can_reply) return;
    setSending(true);
    setReplyError(null);

    try {
      const new_message = await supportTicketsService.addMessage(ticket.id, reply);
      setTicket((prev) => ({
        ...prev,
        messages: [...(prev.messages ?? []), new_message],
        messages_count: (prev.messages_count ?? 0) + 1,
      }));
      setReply("");
      setEditorKey((k) => k + 1); // reset editor
    } catch (err: unknown) {
      const api_error = err as { message?: string };
      setReplyError(api_error?.message ?? "Failed to send reply. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleStatusUpdate = async (new_status: TicketStatus) => {
    if (updating_status || new_status === ticket.status) return;
    setUpdatingStatus(true);
    try {
      const updated = await supportTicketsService.updateTicket(ticket.id, { status: new_status });
      setTicket((prev) => ({ ...prev, status: updated.status }));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const messages = ticket.messages ?? [];

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push("/support")}
            className="mt-0.5 flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-all shrink-0"
            aria-label="Back to tickets"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{ticket.ticket_number}</span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status_bg_map[ticket.status]}`}>
                {status_label_map[ticket.status]}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${priority_color_map[ticket.priority]}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${priority_dot_map[ticket.priority]}`} />
                {priority_label_map[ticket.priority]}
              </span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {ticket.subject}
            </h1>
            <div className="mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <span>Opened {formatTicketDate(ticket.created_at)}</span>
              {ticket.related_order && (
                <>
                  <span>·</span>
                  <span>Order: {ticket.related_order}</span>
                </>
              )}
              <span>·</span>
              <span>{messages.length} message{messages.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        {/* Status actions */}
        {!is_closed && (
          <div className="flex items-center gap-2 shrink-0">
            {CLOSE_STATUSES.filter((s) => s.value !== ticket.status && s.value !== "open").map((s) => (
              <button
                key={s.value}
                onClick={() => handleStatusUpdate(s.value)}
                disabled={updating_status}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
              >
                {updating_status ? "Updating..." : s.label}
              </button>
            ))}
          </div>
        )}

        {is_closed && (
          <button
            onClick={() => handleStatusUpdate("open")}
            disabled={updating_status}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 border border-brand-200 dark:border-brand-700 rounded-lg px-3 py-1.5 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all disabled:opacity-50"
          >
            {updating_status ? "Updating..." : "Reopen Ticket"}
          </button>
        )}
      </div>

      {/* Conversation */}
      <div className="py-6 space-y-4 max-h-[560px] overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
            No messages yet.
          </p>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              is_own={msg.sender_id === current_user_id}
            />
          ))
        )}
        <div ref={messages_end_ref} />
      </div>

      {/* Reply area */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-5">
        {is_closed ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-5 py-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              This ticket is closed. Reopen it to send a new message.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusUpdate("open")}
              disabled={updating_status}
            >
              Reopen Ticket
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Reply</p>
            <RichTextEditor
              key={editor_key}
              value={reply}
              onChange={setReply}
              placeholder="Type your reply here..."
              minHeight="140px"
            />

            {reply_error && (
              <div className="flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-2.5 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {reply_error}
              </div>
            )}

            <div className="flex justify-end">
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
                {sending ? "Sending..." : "Send Reply"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function MessageBubble({
  message,
  is_own,
}: {
  message: ApiTicketMessage;
  is_own: boolean;
}) {
  const initials = getSenderInitials(message.sender);
  const full_name = getSenderName(message.sender);
  const time = formatMessageTime(message.created_at);

  return (
    <div className={`flex gap-3 ${is_own ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ${
          is_own ? "bg-coral-500" : "bg-brand-500"
        }`}
        title={full_name}
      >
        {initials}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] space-y-1 ${is_own ? "items-end" : "items-start"} flex flex-col`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium text-gray-600 dark:text-gray-400 ${is_own ? "order-2" : ""}`}>
            {is_own ? "You" : full_name}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">{time}</span>
        </div>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            is_own
              ? "rounded-tr-sm bg-coral-500 text-white"
              : "rounded-tl-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-white/90"
          }`}
          dangerouslySetInnerHTML={{ __html: message.content }}
        />
      </div>
    </div>
  );
}

export default TicketDetail;
