import type { Metadata } from "next";
import AdminSmeContentContent from "@/components/admin/sme-content/AdminSmeContentContent";

export const metadata: Metadata = {
  title: "SME Enhanced Content | Admin",
};

export default function AdminSmeEnhancedPage() {
  return <AdminSmeContentContent default_tab="enhanced" />;
}
