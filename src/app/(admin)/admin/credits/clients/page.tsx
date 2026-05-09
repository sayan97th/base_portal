import type { Metadata } from "next";
import React from "react";
import AdminCreditsClientsContent from "@/components/admin/credits/AdminCreditsClientsContent";

export const metadata: Metadata = {
  title: "Clients Credits | BASE Admin Portal",
  description: "View and manage credit balances across all clients",
};

export default function AdminCreditsClientsPage() {
  return <AdminCreditsClientsContent />;
}
