import type { Metadata } from "next";
import React from "react";
import AdminInvitationsContent from "@/components/admin/invitations/AdminInvitationsContent";

export const metadata: Metadata = {
  title: "Team Invitations | BASE Admin Portal",
  description: "Manage team invitations",
};

export default function AdminInvitationsPage() {
  return <AdminInvitationsContent />;
}
