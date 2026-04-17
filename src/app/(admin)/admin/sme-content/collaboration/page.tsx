import type { Metadata } from "next";
import AdminSmeContentContent from "@/components/admin/sme-content/AdminSmeContentContent";

export const metadata: Metadata = {
  title: "SME Collaboration Content | Admin",
};

export default function AdminSmeCollaborationPage() {
  return <AdminSmeContentContent default_tab="collaboration" />;
}
