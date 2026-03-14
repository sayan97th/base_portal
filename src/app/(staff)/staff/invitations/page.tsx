import type { Metadata } from "next";
import React from "react";
import StaffInvitationsContent from "@/components/staff/StaffInvitationsContent";

export const metadata: Metadata = {
  title: "Team Invitations | BASE Staff Portal",
  description: "Manage staff invitations",
};

export default function StaffInvitationsPage() {
  return <StaffInvitationsContent />;
}
