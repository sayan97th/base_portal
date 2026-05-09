import type { Metadata } from "next";
import React from "react";
import AdminCreditsContent from "@/components/admin/credits/AdminCreditsContent";

export const metadata: Metadata = {
  title: "Credits | BASE Admin Portal",
  description: "Assign and manage account credits for clients",
};

export default function AdminCreditsPage() {
  return <AdminCreditsContent />;
}
