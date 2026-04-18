import type { Metadata } from "next";
import AdminSeoPackagesContent from "@/components/admin/seo-packages/AdminSeoPackagesContent";

export const metadata: Metadata = {
  title: "SEO Packages | Admin Portal",
  description: "Manage SEO packages, features, and pricing.",
};

export default function AdminSeoPackagesPage() {
  return <AdminSeoPackagesContent />;
}
