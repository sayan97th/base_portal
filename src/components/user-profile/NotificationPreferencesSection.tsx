"use client";
import React from "react";
import Radio from "@/components/form/input/Radio";
import Checkbox from "@/components/form/input/Checkbox";
import Switch from "@/components/form/switch/Switch";

interface NotificationPreferencesSectionProps {
  notification_channel: string;
  team_order_updates: boolean;
  push_notifications_enabled: boolean;
  onNotificationChannelChange: (value: string) => void;
  onTeamOrderUpdatesChange: (checked: boolean) => void;
  onPushNotificationsChange: (checked: boolean) => void;
}

export default function NotificationPreferencesSection({
  notification_channel,
  team_order_updates,
  push_notifications_enabled,
  onNotificationChannelChange,
  onTeamOrderUpdatesChange,
  onPushNotificationsChange,
}: NotificationPreferencesSectionProps) {
  return (
    <section>
      <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
        Notification preferences
      </h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        If you disable email updates you&apos;ll need to log in to read our
        replies.
      </p>

      <div className="space-y-5">
        {/* Email and portal / Portal only */}
        <div className="space-y-3">
          <Radio
            id="notification_email_and_portal"
            name="notification_channel"
            value="email_and_portal"
            checked={notification_channel === "email_and_portal"}
            label="Email and portal"
            onChange={onNotificationChannelChange}
          />
          <Radio
            id="notification_portal_only"
            name="notification_channel"
            value="portal_only"
            checked={notification_channel === "portal_only"}
            label="Portal only"
            onChange={onNotificationChannelChange}
          />
        </div>

        {/* Team order updates checkbox */}
        <div>
          <Checkbox
            id="team_order_updates"
            label="Get updates about your team's orders"
            checked={team_order_updates}
            onChange={onTeamOrderUpdatesChange}
          />
          <p className="ml-8 mt-1 text-xs text-gray-400 dark:text-gray-500">
            If left unchecked you&apos;ll be following updates in your own
            orders only.
          </p>
        </div>

        {/* Push notifications switch */}
        <Switch
          label="Enable push notifications in this browser"
          defaultChecked={push_notifications_enabled}
          onChange={onPushNotificationsChange}
        />
      </div>
    </section>
  );
}
