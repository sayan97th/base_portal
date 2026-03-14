import type { Metadata } from "next";
import React from "react";
import StaffOrganizationsContent from "@/components/staff/StaffOrganizationsContent";

export const metadata: Metadata = {
  title: "Organizations | BASE Staff Portal",
  description: "Manage client organizations",
};

export default function StaffOrganizationsPage() {
  return <StaffOrganizationsContent />;
}
