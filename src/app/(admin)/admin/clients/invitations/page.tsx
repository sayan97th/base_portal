import type { Metadata } from "next";
import React from "react";
import AdminClientInvitationsContent from "@/components/admin/clients/AdminClientInvitationsContent";

export const metadata: Metadata = {
  title: "Client Invitations | BASE Admin Portal",
  description: "Manage client invitations sent from the platform.",
};

export default function AdminClientInvitationsPage() {
  return <AdminClientInvitationsContent />;
}
