import type { Metadata } from "next";
import AdminContentBriefsContent from "@/components/admin/content-briefs/AdminContentBriefsContent";

export const metadata: Metadata = {
  title: "Content Briefs | Admin Portal",
  description: "Manage Content Brief service tiers, pricing, and availability.",
};

export default function AdminContentBriefsPage() {
  return <AdminContentBriefsContent />;
}
