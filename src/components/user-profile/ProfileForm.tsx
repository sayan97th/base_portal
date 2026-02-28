"use client";
import React, { useState, useEffect } from "react";
import Button from "@/components/ui/button/Button";
import EditDetailsSection from "./EditDetailsSection";
import NotificationPreferencesSection from "./NotificationPreferencesSection";
import BillingAddressSection from "./BillingAddressSection";
import ProfileSettingsSection from "./ProfileSettingsSection";
import { useAuth } from "@/context/AuthContext";
import { profileService } from "@/services/profile.service";
import type { ProfileData } from "@/types/auth";

const default_form_data: ProfileData = {
  business_email: "",
  first_name: "",
  last_name: "",
  notification_channel: "email_and_portal",
  team_order_updates: false,
  push_notifications_enabled: false,
  address: "",
  city: "",
  country: "",
  state_province: "",
  postal_code: "",
  company: "",
  tax_id: "",
  phone: "",
  timezone: "",
  interested_in: "",
};

export default function ProfileForm() {
  const { refreshUser } = useAuth();
  const [form_data, setFormData] = useState<ProfileData>(default_form_data);
  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [success_message, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await profileService.fetchUserProfile();
        setFormData(data);
      } catch {
        setErrorMessage("Failed to load profile data.");
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await profileService.updateUserProfile(form_data);
      await refreshUser();
      setSuccessMessage("Profile updated successfully.");
    } catch {
      setErrorMessage("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (is_loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-10">
        {error_message && (
          <div className="rounded-lg border border-error-300 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400">
            {error_message}
          </div>
        )}
        {success_message && (
          <div className="rounded-lg border border-success-300 bg-success-50 px-4 py-3 text-sm text-success-600 dark:border-success-500/40 dark:bg-success-500/10 dark:text-success-400">
            {success_message}
          </div>
        )}

        <EditDetailsSection
          business_email={form_data.business_email}
          password=""
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
          phone={form_data.phone ?? ""}
          timezone={form_data.timezone}
          interested_in={form_data.interested_in}
          onFieldChange={handleFieldChange}
        />

        {/* Save Changes Button */}
        <div className="flex justify-end">
          <Button size="md" variant="primary" disabled={is_saving}>
            {is_saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
