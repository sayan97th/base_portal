"use client";
import React from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";

const timezone_options = [
  { value: "Pacific/Midway", label: "Pacific/Midway (UTC-11:00)" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (UTC-10:00)" },
  { value: "America/Adak", label: "America/Adak (UTC-10:00)" },
  { value: "America/Anchorage", label: "America/Anchorage (UTC-09:00)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (UTC-08:00)" },
  { value: "America/Phoenix", label: "America/Phoenix (UTC-07:00)" },
  { value: "America/Denver", label: "America/Denver (UTC-07:00)" },
  { value: "America/Chicago", label: "America/Chicago (UTC-06:00)" },
  { value: "America/New_York", label: "America/New York (UTC-05:00)" },
  { value: "America/Indiana/Indianapolis", label: "America/Indianapolis (UTC-05:00)" },
  { value: "America/Halifax", label: "America/Halifax (UTC-04:00)" },
  { value: "America/St_Johns", label: "America/St Johns (UTC-03:30)" },
  { value: "America/Sao_Paulo", label: "America/Sao Paulo (UTC-03:00)" },
  { value: "America/Argentina/Buenos_Aires", label: "America/Buenos Aires (UTC-03:00)" },
  { value: "Atlantic/South_Georgia", label: "Atlantic/South Georgia (UTC-02:00)" },
  { value: "Atlantic/Azores", label: "Atlantic/Azores (UTC-01:00)" },
  { value: "Europe/London", label: "Europe/London (UTC+00:00)" },
  { value: "Europe/Lisbon", label: "Europe/Lisbon (UTC+00:00)" },
  { value: "Africa/Casablanca", label: "Africa/Casablanca (UTC+00:00)" },
  { value: "Europe/Paris", label: "Europe/Paris (UTC+01:00)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (UTC+01:00)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (UTC+01:00)" },
  { value: "Europe/Rome", label: "Europe/Rome (UTC+01:00)" },
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam (UTC+01:00)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (UTC+01:00)" },
  { value: "Europe/Athens", label: "Europe/Athens (UTC+02:00)" },
  { value: "Europe/Helsinki", label: "Europe/Helsinki (UTC+02:00)" },
  { value: "Europe/Istanbul", label: "Europe/Istanbul (UTC+03:00)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (UTC+03:00)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (UTC+03:00)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (UTC+04:00)" },
  { value: "Asia/Karachi", label: "Asia/Karachi (UTC+05:00)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (UTC+05:30)" },
  { value: "Asia/Kathmandu", label: "Asia/Kathmandu (UTC+05:45)" },
  { value: "Asia/Dhaka", label: "Asia/Dhaka (UTC+06:00)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (UTC+07:00)" },
  { value: "Asia/Jakarta", label: "Asia/Jakarta (UTC+07:00)" },
  { value: "Asia/Shanghai", label: "Asia/Shanghai (UTC+08:00)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (UTC+08:00)" },
  { value: "Asia/Hong_Kong", label: "Asia/Hong Kong (UTC+08:00)" },
  { value: "Asia/Taipei", label: "Asia/Taipei (UTC+08:00)" },
  { value: "Asia/Seoul", label: "Asia/Seoul (UTC+09:00)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+09:00)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (UTC+10:00)" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (UTC+10:00)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (UTC+12:00)" },
  { value: "Pacific/Fiji", label: "Pacific/Fiji (UTC+12:00)" },
];

const interest_options = [
  { value: "", label: "Nothing selected" },
  { value: "links", label: "Links" },
  { value: "content", label: "Content" },
  { value: "both", label: "Both" },
];

interface ProfileSettingsSectionProps {
  phone: string;
  timezone: string;
  interested_in: string;
  onFieldChange: (field: string, value: string) => void;
}

export default function ProfileSettingsSection({
  phone,
  timezone,
  interested_in,
  onFieldChange,
}: ProfileSettingsSectionProps) {
  return (
    <section className="space-y-6">
      {/* Phone */}
      <div>
        <Label htmlFor="phone" className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-4">
          Phone
        </Label>
        <Input
          id="phone"
          name="phone"
          type="text"
          defaultValue={phone}
          placeholder="Enter your phone number"
          onChange={(e) => onFieldChange("phone", e.target.value)}
        />
      </div>

      {/* Timezone */}
      <div>
        <Label htmlFor="timezone" className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-4">
          Timezone
        </Label>
        <Select
          options={timezone_options}
          defaultValue={timezone}
          onChange={(value) => onFieldChange("timezone", value)}
          placeholder="Select timezone"
        />
      </div>

      {/* Interested In */}
      <div>
        <div className="mb-1.5 flex items-center gap-2">
          <Label htmlFor="interested_in" className="mb-0 text-xl font-semibold text-gray-800 dark:text-white/90">
            I am interested in:
          </Label>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            optional
          </span>
        </div>
        <Select
          options={interest_options}
          defaultValue={interested_in}
          onChange={(value) => onFieldChange("interested_in", value)}
          placeholder="Nothing selected"
        />
      </div>
    </section>
  );
}
