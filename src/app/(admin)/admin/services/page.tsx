import type { Metadata } from "next";
import AdminServicesContent from "@/components/admin/services/AdminServicesContent";

export const metadata: Metadata = {
  title: "Services | Admin Portal",
  description: "Manage platform services and pricing tiers.",
};

export default function AdminServicesPage() {
  return <AdminServicesContent />;
}
