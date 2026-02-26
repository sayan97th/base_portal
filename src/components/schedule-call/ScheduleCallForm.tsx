"use client";

import React, { useState } from "react";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import TextArea from "@/components/form/input/TextArea";
import { call_type_options, duration_options } from "./scheduleCallData";

interface ScheduleCallFormProps {
  onBack: () => void;
  onSubmit: (call_data: {
    contact_name: string;
    contact_email: string;
    call_type: string;
    scheduled_date: string;
    scheduled_time: string;
    duration: string;
    notes: string;
  }) => void;
}

const ScheduleCallForm: React.FC<ScheduleCallFormProps> = ({
  onBack,
  onSubmit,
}) => {
  const [contact_name, setContactName] = useState("");
  const [contact_email, setContactEmail] = useState("");
  const [call_type, setCallType] = useState("");
  const [scheduled_date, setScheduledDate] = useState("");
  const [scheduled_time, setScheduledTime] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!is_valid) return;

    onSubmit({
      contact_name: contact_name.trim(),
      contact_email: contact_email.trim(),
      call_type,
      scheduled_date,
      scheduled_time,
      duration,
      notes: notes.trim(),
    });

    setContactName("");
    setContactEmail("");
    setCallType("");
    setScheduledDate("");
    setScheduledTime("");
    setDuration("");
    setNotes("");
  };

  const is_valid =
    contact_name.trim().length > 0 &&
    contact_email.trim().length > 0 &&
    call_type.length > 0 &&
    scheduled_date.length > 0 &&
    scheduled_time.length > 0 &&
    duration.length > 0;

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
          Schedule a Call
        </h1>
      </div>

      {/* Form */}
      <div className="max-w-3xl space-y-5">
        {/* Contact Information */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="contact_name">Contact Name</Label>
            <Input
              id="contact_name"
              name="contact_name"
              type="text"
              placeholder="Enter contact name"
              defaultValue={contact_name}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="contact_email">Contact Email</Label>
            <Input
              id="contact_email"
              name="contact_email"
              type="email"
              placeholder="Enter contact email"
              defaultValue={contact_email}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
        </div>

        {/* Call Type */}
        <div>
          <Label htmlFor="call_type">Call Type</Label>
          <Select
            options={call_type_options}
            placeholder="Select call type"
            onChange={(value) => setCallType(value)}
            defaultValue={call_type}
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="scheduled_date">Date</Label>
            <Input
              id="scheduled_date"
              name="scheduled_date"
              type="date"
              defaultValue={scheduled_date}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="scheduled_time">Time</Label>
            <Input
              id="scheduled_time"
              name="scheduled_time"
              type="time"
              defaultValue={scheduled_time}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
        </div>

        {/* Duration */}
        <div>
          <Label htmlFor="duration">Duration</Label>
          <Select
            options={duration_options}
            placeholder="Select duration"
            onChange={(value) => setDuration(value)}
            defaultValue={duration}
          />
        </div>

        {/* Notes */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Label>Notes</Label>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              optional
            </span>
          </div>
          <TextArea
            placeholder="Add any additional notes or agenda items..."
            rows={4}
            value={notes}
            onChange={(value) => setNotes(value)}
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
            Schedule Call
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCallForm;
