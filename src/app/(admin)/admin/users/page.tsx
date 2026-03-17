import type { Metadata } from "next";
import React from "react";
import AdminUsersContent from "@/components/admin/users/AdminUsersContent";

export const metadata: Metadata = {
  title: "User Management | BASE Admin Portal",
  description: "Manage app users (admins & staff) and client accounts separately.",
};

export default function AdminUsersPage() {
  return <AdminUsersContent />;
}
