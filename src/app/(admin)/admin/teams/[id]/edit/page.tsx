import type { Metadata } from "next";
import AdminTeamForm from "@/components/admin/teams/AdminTeamForm";

export const metadata: Metadata = {
  title: "Edit Team | Admin Portal",
  description: "Edit an existing admin team.",
};

export default function AdminEditTeamPage({ params }: { params: { id: string } }) {
  return <AdminTeamForm mode="edit" team_id={params.id} />;
}
