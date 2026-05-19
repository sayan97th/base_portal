"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import RichTextEditor from "./RichTextEditor";
import { order_options, TicketPriority, priority_label_map } from "./supportData";
import { supportTicketsService } from "@/services/client/support-tickets.service";

const PRIORITY_OPTIONS: { value: TicketPriority; description: string; color: string; dot: string }[] = [
  {
    value: "low",
    description: "General question or minor issue",
    color: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  {
    value: "medium",
    description: "Issue affecting your workflow",
    color: "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-400",
    dot: "bg-warning-500",
  },
  {
    value: "high",
    description: "Critical issue needing urgent attention",
    color: "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400",
    dot: "bg-error-500",
  },
];

const NewTicketForm: React.FC = () => {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [related_order, setRelatedOrder] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const is_valid = subject.trim().length > 0 && message.replace(/<[^>]*>/g, "").trim().length > 0;

  const handleSubmit = async () => {
    if (!is_valid || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const ticket = await supportTicketsService.createTicket({
        subject: subject.trim(),
        priority,
        related_order: related_order || undefined,
        content: message,
      });
      router.push(`/support/${ticket.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/support")}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-all"
          aria-label="Go back"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">New Ticket</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Describe your issue and we'll get back to you</p>
        </div>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Subject */}
        <div>
          <Label htmlFor="ticket_subject">Subject</Label>
          <div className="mt-1 relative">
            <Input
              id="ticket_subject"
              name="ticket_subject"
              type="text"
              placeholder="Brief description of your issue"
              defaultValue={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            {subject.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {subject.length}/255
              </span>
            )}
          </div>
        </div>

        {/* Priority */}
        <div>
          <Label>Priority</Label>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPriority(opt.value)}
                className={`relative rounded-xl border-2 p-3.5 text-left transition-all ${
                  priority === opt.value
                    ? opt.color + " ring-2 ring-offset-1 ring-current/30"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-600"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`h-2 w-2 rounded-full ${opt.dot}`} />
                  <span className="text-sm font-semibold">{priority_label_map[opt.value]}</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-75">{opt.description}</p>
                {priority === opt.value && (
                  <span className="absolute top-2 right-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Related Order */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor="related_order">Related Order</Label>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
          </div>
          <Select
            options={order_options}
            placeholder="Select an order if applicable..."
            onChange={(value) => setRelatedOrder(value)}
            defaultValue={related_order}
          />
        </div>

        {/* Message */}
        <div>
          <Label>Message</Label>
          <div className="mt-1">
            <RichTextEditor
              value={message}
              onChange={setMessage}
              placeholder="Describe your issue in detail. Include any relevant steps, screenshots, or context..."
              minHeight="220px"
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
            Markdown formatting is supported. Be as specific as possible to help us resolve your issue faster.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => router.push("/support")}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <Button
            variant="coral"
            size="sm"
            onClick={handleSubmit}
            disabled={!is_valid || submitting}
            startIcon={
              submitting ? (
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
            {submitting ? "Submitting..." : "Submit Ticket"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewTicketForm;
