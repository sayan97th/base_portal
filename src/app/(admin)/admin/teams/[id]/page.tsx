import type { Metadata } from "next";
import AdminTeamDetail from "@/components/admin/teams/AdminTeamDetail";

export const metadata: Metadata = {
  title: "Team Details | Admin Portal",
  description: "View and manage team members.",
};

export default async function AdminTeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminTeamDetail team_id={id} />;
}
