import type { Metadata } from "next";
import AdminSmeAppointmentsContent from "@/components/admin/sme-appointments/AdminSmeAppointmentsContent";

export const metadata: Metadata = {
  title: "SME Appointments | Admin",
};

export default function AdminSmeAppointmentsPage() {
  return <AdminSmeAppointmentsContent />;
}
