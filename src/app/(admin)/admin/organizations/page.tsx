import type { Metadata } from "next";
import React from "react";
import AdminOrganizationsContent from "@/components/admin/organizations/AdminOrganizationsContent";

export const metadata: Metadata = {
  title: "Organizations | BASE Admin Portal",
  description: "Manage client organizations",
};

export default function AdminOrganizationsPage() {
  return <AdminOrganizationsContent />;
}
