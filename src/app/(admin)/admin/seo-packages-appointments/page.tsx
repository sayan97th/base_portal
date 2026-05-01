import type { Metadata } from "next";
import AdminSeoPackagesAppointmentsContent from "@/components/admin/seo-packages-appointments/AdminSeoPackagesAppointmentsContent";

export const metadata: Metadata = {
  title: "SEO Packages Appointments | Admin",
};

export default function AdminSeoPackagesAppointmentsPage() {
  return <AdminSeoPackagesAppointmentsContent />;
}
