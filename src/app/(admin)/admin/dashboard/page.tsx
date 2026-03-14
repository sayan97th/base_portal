import type { Metadata } from "next";
import React from "react";
import AdminDashboardContent from "@/components/admin/AdminDashboardContent";

export const metadata: Metadata = {
  title: "BASE Search Marketing | Admin Dashboard",
  description: "Internal admin dashboard for BASE Search Marketing team",
};

export default function AdminDashboardPage() {
  return <AdminDashboardContent />;
}
