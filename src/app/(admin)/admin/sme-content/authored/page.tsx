import type { Metadata } from "next";
import AdminSmeContentContent from "@/components/admin/sme-content/AdminSmeContentContent";

export const metadata: Metadata = {
  title: "SME Authored Content | Admin",
};

export default function AdminSmeAuthoredPage() {
  return <AdminSmeContentContent default_tab="authored" />;
}
