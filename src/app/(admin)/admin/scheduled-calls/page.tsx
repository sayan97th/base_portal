import type { Metadata } from "next";
import AdminScheduledCallsContent from "@/components/admin/scheduled-calls/AdminScheduledCallsContent";

export const metadata: Metadata = {
  title: "Scheduled Calls | Admin",
};

export default function AdminScheduledCallsPage() {
  return <AdminScheduledCallsContent />;
}
