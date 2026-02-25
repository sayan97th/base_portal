"use client";
import React, { useState } from "react";
import Button from "@/components/ui/button/Button";
import EditDetailsSection from "./EditDetailsSection";
import NotificationPreferencesSection from "./NotificationPreferencesSection";
import BillingAddressSection from "./BillingAddressSection";
import ProfileSettingsSection from "./ProfileSettingsSection";

interface ProfileFormData {
  business_email: string;
  password: string;
  first_name: string;
  last_name: string;
  notification_channel: string;
  team_order_updates: boolean;
  push_notifications_enabled: boolean;
  address: string;
  city: string;
  country: string;
  state_province: string;
  postal_code: string;
  company: string;
  tax_id: string;
  phone: string;
  timezone: string;
  interested_in: string;
}

const initial_form_data: ProfileFormData = {
  business_email: "marketing@basesearchmarketing.com",
  password: "password",
  first_name: "BASE",
  last_name: "Marketing",
  notification_channel: "email_and_portal",
  team_order_updates: false,
  push_notifications_enabled: false,
  address: "test",
  city: "test",
  country: "US",
  state_province: "AL",
  postal_code: "test",
  company: "BASE Search Marketing",
  tax_id: "",
  phone: "",
  timezone: "America/Adak",
  interested_in: "",
};

export default function ProfileForm() {
  const [form_data, setFormData] = useState<ProfileFormData>(initial_form_data);

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNotificationChannelChange = (value: string) => {
    setFormData((prev) => ({ ...prev, notification_channel: value }));
  };

  const handleTeamOrderUpdatesChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, team_order_updates: checked }));
  };

  const handlePushNotificationsChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, push_notifications_enabled: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Saving profile data:", form_data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-10">
        <EditDetailsSection
          business_email={form_data.business_email}
          password={form_data.password}
          first_name={form_data.first_name}
          last_name={form_data.last_name}
          onFieldChange={handleFieldChange}
        />

        <hr className="border-gray-200 dark:border-gray-800" />

        <NotificationPreferencesSection
          notification_channel={form_data.notification_channel}
          team_order_updates={form_data.team_order_updates}
          push_notifications_enabled={form_data.push_notifications_enabled}
          onNotificationChannelChange={handleNotificationChannelChange}
          onTeamOrderUpdatesChange={handleTeamOrderUpdatesChange}
          onPushNotificationsChange={handlePushNotificationsChange}
        />

        <hr className="border-gray-200 dark:border-gray-800" />

        <BillingAddressSection
          address={form_data.address}
          city={form_data.city}
          country={form_data.country}
          state_province={form_data.state_province}
          postal_code={form_data.postal_code}
          company={form_data.company}
          tax_id={form_data.tax_id}
          onFieldChange={handleFieldChange}
        />

        <hr className="border-gray-200 dark:border-gray-800" />

        <ProfileSettingsSection
          phone={form_data.phone}
          timezone={form_data.timezone}
          interested_in={form_data.interested_in}
          onFieldChange={handleFieldChange}
        />

        {/* Save Changes Button */}
        <div className="flex justify-end">
          <Button size="md" variant="primary">
            Save changes
          </Button>
        </div>
      </div>
    </form>
  );
}
