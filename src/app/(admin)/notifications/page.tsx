import type { Metadata } from "next";
import NotificationsPage from "@/components/notifications/NotificationsPage";

export const metadata: Metadata = {
  title: "Notifications | BASE Search Marketing",
  description: "View all your notifications and updates.",
};

export default function Notifications() {
  return <NotificationsPage />;
}
