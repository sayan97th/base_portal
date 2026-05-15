import type { Metadata } from "next";
import AdminTeamDetail from "@/components/admin/teams/AdminTeamDetail";

export const metadata: Metadata = {
  title: "Team Details | Admin Portal",
  description: "View and manage team members.",
};

export default function AdminTeamDetailPage({ params }: { params: { id: string } }) {
  return <AdminTeamDetail team_id={params.id} />;
}
