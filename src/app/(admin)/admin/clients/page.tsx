import type { Metadata } from "next";
import React from "react";
import AdminClientsContent from "@/components/admin/clients/AdminClientsContent";

export const metadata: Metadata = {
  title: "Clients | BASE Admin Portal",
  description: "Manage registered client accounts on the platform.",
};

export default function AdminClientsPage() {
  return <AdminClientsContent />;
}
