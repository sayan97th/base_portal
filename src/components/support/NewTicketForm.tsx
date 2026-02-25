"use client";

import React, { useState } from "react";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import RichTextEditor from "./RichTextEditor";
import { order_options } from "./supportData";

interface NewTicketFormProps {
  onBack: () => void;
  onSubmit: (ticket_data: {
    subject: string;
    related_order: string;
    message: string;
  }) => void;
}

const NewTicketForm: React.FC<NewTicketFormProps> = ({ onBack, onSubmit }) => {
  const [subject, setSubject] = useState("");
  const [related_order, setRelatedOrder] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) return;

    onSubmit({
      subject: subject.trim(),
      related_order,
      message,
    });

    setSubject("");
    setRelatedOrder("");
    setMessage("");
  };

  const is_valid = subject.trim().length > 0 && message.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors"
          aria-label="Go back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          New ticket
        </h1>
      </div>

      {/* Form */}
      <div className="max-w-3xl space-y-5">
        {/* Subject */}
        <div>
          <Label htmlFor="ticket_subject">Subject</Label>
          <Input
            id="ticket_subject"
            name="ticket_subject"
            type="text"
            placeholder="Enter ticket subject"
            defaultValue={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Related Order */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor="related_order">Related order</Label>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              optional
            </span>
          </div>
          <Select
            options={order_options}
            placeholder="Please select..."
            onChange={(value) => setRelatedOrder(value)}
            defaultValue={related_order}
          />
        </div>

        {/* Message */}
        <div>
          <Label>Message</Label>
          <RichTextEditor
            value={message}
            onChange={(value) => setMessage(value)}
            placeholder="Type your message here..."
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <Button
            variant="coral"
            size="sm"
            onClick={handleSubmit}
            disabled={!is_valid}
          >
            Send message
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewTicketForm;
