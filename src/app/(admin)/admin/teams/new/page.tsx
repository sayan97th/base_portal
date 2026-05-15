import type { Metadata } from "next";
import AdminTeamForm from "@/components/admin/teams/AdminTeamForm";

export const metadata: Metadata = {
  title: "New Team | Admin Portal",
  description: "Create a new admin team.",
};

export default function AdminNewTeamPage() {
  return <AdminTeamForm mode="create" />;
}
