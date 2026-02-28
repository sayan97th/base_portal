"use client";
import React from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";

const timezone_options = [
  // US Timezones
  { value: "America/Adak", label: "America/Adak (UTC-10:00)" },
  { value: "America/Anchorage", label: "America/Anchorage (UTC-09:00)" },
  { value: "America/Juneau", label: "America/Juneau (UTC-09:00)" },
  { value: "America/Nome", label: "America/Nome (UTC-09:00)" },
  { value: "America/Sitka", label: "America/Sitka (UTC-09:00)" },
  { value: "America/Yakutat", label: "America/Yakutat (UTC-09:00)" },
  { value: "America/Los_Angeles", label: "America/Los Angeles (UTC-08:00)" },
  { value: "America/Boise", label: "America/Boise (UTC-07:00)" },
  { value: "America/Denver", label: "America/Denver (UTC-07:00)" },
  { value: "America/Phoenix", label: "America/Phoenix (UTC-07:00)" },
  { value: "America/Chicago", label: "America/Chicago (UTC-06:00)" },
  { value: "America/Indiana/Knox", label: "America/Indiana/Knox (UTC-06:00)" },
  { value: "America/Indiana/Tell_City", label: "America/Indiana/Tell City (UTC-06:00)" },
  { value: "America/Menominee", label: "America/Menominee (UTC-06:00)" },
  { value: "America/North_Dakota/Beulah", label: "America/North Dakota/Beulah (UTC-06:00)" },
  { value: "America/North_Dakota/Center", label: "America/North Dakota/Center (UTC-06:00)" },
  { value: "America/North_Dakota/New_Salem", label: "America/North Dakota/New Salem (UTC-06:00)" },
  { value: "America/Detroit", label: "America/Detroit (UTC-05:00)" },
  { value: "America/Indiana/Indianapolis", label: "America/Indiana/Indianapolis (UTC-05:00)" },
  { value: "America/Indiana/Marengo", label: "America/Indiana/Marengo (UTC-05:00)" },
  { value: "America/Indiana/Petersburg", label: "America/Indiana/Petersburg (UTC-05:00)" },
  { value: "America/Indiana/Vevay", label: "America/Indiana/Vevay (UTC-05:00)" },
  { value: "America/Indiana/Vincennes", label: "America/Indiana/Vincennes (UTC-05:00)" },
  { value: "America/Indiana/Winamac", label: "America/Indiana/Winamac (UTC-05:00)" },
  { value: "America/Kentucky/Louisville", label: "America/Kentucky/Louisville (UTC-05:00)" },
  { value: "America/Kentucky/Monticello", label: "America/Kentucky/Monticello (UTC-05:00)" },
  { value: "America/New_York", label: "America/New York (UTC-05:00)" },
  // Americas (non-US)
  { value: "America/Vancouver", label: "America/Vancouver (UTC-08:00)" },
  { value: "America/Tijuana", label: "America/Tijuana (UTC-08:00)" },
  { value: "America/Edmonton", label: "America/Edmonton (UTC-07:00)" },
  { value: "America/Hermosillo", label: "America/Hermosillo (UTC-07:00)" },
  { value: "America/Mazatlan", label: "America/Mazatlan (UTC-07:00)" },
  { value: "America/Winnipeg", label: "America/Winnipeg (UTC-06:00)" },
  { value: "America/Mexico_City", label: "America/Mexico City (UTC-06:00)" },
  { value: "America/Costa_Rica", label: "America/Costa Rica (UTC-06:00)" },
  { value: "America/Guatemala", label: "America/Guatemala (UTC-06:00)" },
  { value: "America/El_Salvador", label: "America/El Salvador (UTC-06:00)" },
  { value: "America/Tegucigalpa", label: "America/Tegucigalpa (UTC-06:00)" },
  { value: "America/Managua", label: "America/Managua (UTC-06:00)" },
  { value: "America/Toronto", label: "America/Toronto (UTC-05:00)" },
  { value: "America/Panama", label: "America/Panama (UTC-05:00)" },
  { value: "America/Bogota", label: "America/Bogota (UTC-05:00)" },
  { value: "America/Lima", label: "America/Lima (UTC-05:00)" },
  { value: "America/Guayaquil", label: "America/Guayaquil (UTC-05:00)" },
  { value: "America/Cancun", label: "America/Cancun (UTC-05:00)" },
  { value: "America/Havana", label: "America/Havana (UTC-05:00)" },
  { value: "America/Jamaica", label: "America/Jamaica (UTC-05:00)" },
  { value: "America/Caracas", label: "America/Caracas (UTC-04:00)" },
  { value: "America/La_Paz", label: "America/La Paz (UTC-04:00)" },
  { value: "America/Santiago", label: "America/Santiago (UTC-04:00)" },
  { value: "America/Santo_Domingo", label: "America/Santo Domingo (UTC-04:00)" },
  { value: "America/Asuncion", label: "America/Asuncion (UTC-04:00)" },
  { value: "America/Halifax", label: "America/Halifax (UTC-04:00)" },
  { value: "America/Montevideo", label: "America/Montevideo (UTC-03:00)" },
  { value: "America/St_Johns", label: "America/St Johns (UTC-03:30)" },
  { value: "America/Sao_Paulo", label: "America/Sao Paulo (UTC-03:00)" },
  { value: "America/Argentina/Buenos_Aires", label: "America/Buenos Aires (UTC-03:00)" },
  // Pacific
  { value: "Pacific/Midway", label: "Pacific/Midway (UTC-11:00)" },
  { value: "Pacific/Honolulu", label: "Pacific/Honolulu (UTC-10:00)" },
  { value: "Pacific/Auckland", label: "Pacific/Auckland (UTC+12:00)" },
  { value: "Pacific/Fiji", label: "Pacific/Fiji (UTC+12:00)" },
  // Atlantic
  { value: "Atlantic/South_Georgia", label: "Atlantic/South Georgia (UTC-02:00)" },
  { value: "Atlantic/Azores", label: "Atlantic/Azores (UTC-01:00)" },
  // Europe
  { value: "Europe/London", label: "Europe/London (UTC+00:00)" },
  { value: "Europe/Lisbon", label: "Europe/Lisbon (UTC+00:00)" },
  { value: "Europe/Paris", label: "Europe/Paris (UTC+01:00)" },
  { value: "Europe/Berlin", label: "Europe/Berlin (UTC+01:00)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (UTC+01:00)" },
  { value: "Europe/Rome", label: "Europe/Rome (UTC+01:00)" },
  { value: "Europe/Amsterdam", label: "Europe/Amsterdam (UTC+01:00)" },
  { value: "Europe/Athens", label: "Europe/Athens (UTC+02:00)" },
  { value: "Europe/Helsinki", label: "Europe/Helsinki (UTC+02:00)" },
  { value: "Europe/Istanbul", label: "Europe/Istanbul (UTC+03:00)" },
  { value: "Europe/Moscow", label: "Europe/Moscow (UTC+03:00)" },
  // Africa
  { value: "Africa/Casablanca", label: "Africa/Casablanca (UTC+00:00)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (UTC+01:00)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (UTC+03:00)" },
  // Asia
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
  // Australia
  { value: "Australia/Sydney", label: "Australia/Sydney (UTC+10:00)" },
  { value: "Australia/Melbourne", label: "Australia/Melbourne (UTC+10:00)" },
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
