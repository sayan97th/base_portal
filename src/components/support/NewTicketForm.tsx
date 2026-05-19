"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import { order_options } from "./supportData";
import { supportTicketsService } from "@/services/client/support-tickets.service";


const NewTicketForm: React.FC = () => {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [related_order, setRelatedOrder] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const is_valid = subject.trim().length > 0 && message.trim().length > 0;

  const handleSubmit = async () => {
    if (!is_valid || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const ticket = await supportTicketsService.createTicket({
        subject: subject.trim(),
        priority: "medium",
        related_order: related_order || undefined,
        content: message.trim(),
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
          type="button"
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

        {/* Related Order */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor="related_order">Related Order</Label>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">(optional)</span>
          </div>
          <Select
            options={order_options}
            placeholder="Select a service if applicable..."
            onChange={(value) => setRelatedOrder(value)}
            defaultValue={related_order}
          />
        </div>

        {/* Message */}
        <div>
          <Label htmlFor="ticket_message">Message</Label>
          <div className="mt-1">
            <textarea
              id="ticket_message"
              name="ticket_message"
              rows={8}
              placeholder="Describe your issue in detail. Include any relevant steps or context..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 shadow-theme-xs resize-none focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
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
            type="button"
            onClick={() => router.push("/support")}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <Button
            type="button"
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
