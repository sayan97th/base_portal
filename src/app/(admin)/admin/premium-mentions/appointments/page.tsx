import type { Metadata } from "next";
import AdminPremiumMentionsAppointmentsContent from "@/components/admin/premium-mentions/AdminPremiumMentionsAppointmentsContent";

export const metadata: Metadata = {
  title: "Premium Mentions Appointments | Admin",
};

export default function AdminPremiumMentionsAppointmentsPage() {
  return <AdminPremiumMentionsAppointmentsContent />;
}
