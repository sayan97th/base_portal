import type { Metadata } from "next";
import AdminLinkBuildingContent from "@/components/admin/link-building/AdminLinkBuildingContent";

export const metadata: Metadata = {
  title: "Link Building | Admin Portal",
  description: "Manage Link Building services and pricing tiers.",
};

export default function AdminLinkBuildingPage() {
  return <AdminLinkBuildingContent />;
}
