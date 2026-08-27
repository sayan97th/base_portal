import type { Metadata } from "next";
import NotificationRedirectGate from "@/components/admin/notifications/NotificationRedirectGate";

interface NotificationRedirectPageProps {
  searchParams: Promise<{ notification_id?: string }>;
}

export const metadata: Metadata = {
  title: "Notification | BASE Admin Portal",
  description: "Resolving a client-side notification link opened from the admin side.",
};

export default async function NotificationRedirectPage({
  searchParams,
}: NotificationRedirectPageProps) {
  const { notification_id } = await searchParams;

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-8">
      <NotificationRedirectGate notification_id={notification_id ?? null} />
    </div>
  );
}
