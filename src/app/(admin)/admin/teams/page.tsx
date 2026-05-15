import type { Metadata } from "next";
import AdminTeamsContent from "@/components/admin/teams/AdminTeamsContent";

export const metadata: Metadata = {
  title: "Teams | Admin Portal",
  description: "Manage admin teams and their members.",
};

export default function AdminTeamsPage() {
  return <AdminTeamsContent />;
}
