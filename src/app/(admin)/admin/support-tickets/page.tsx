import type { Metadata } from "next";
import AdminTicketList from "@/components/admin/support-tickets/AdminTicketList";

export const metadata: Metadata = {
  title: "Support Tickets | Admin Portal",
  description: "View and manage all client support tickets.",
};

export default function AdminSupportTicketsPage() {
  return <AdminTicketList />;
}
