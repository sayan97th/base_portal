import type { Metadata } from "next";
import React from "react";
import AdminUsersContent from "@/components/admin/AdminUsersContent";

export const metadata: Metadata = {
  title: "Users | BASE Admin Portal",
  description: "Manage platform users",
};

export default function AdminUsersPage() {
  return <AdminUsersContent />;
}
