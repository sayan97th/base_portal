import type { Metadata } from "next";
import AdminTeamForm from "@/components/admin/teams/AdminTeamForm";

export const metadata: Metadata = {
  title: "Edit Team | Admin Portal",
  description: "Edit an existing admin team.",
};

export default async function AdminEditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminTeamForm mode="edit" team_id={id} />;
}
