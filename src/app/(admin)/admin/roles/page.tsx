import type { Metadata } from "next";
import React from "react";
import AdminRolesContent from "@/components/admin/roles/AdminRolesContent";

export const metadata: Metadata = {
  title: "Roles & Permissions | BASE Admin Portal",
  description: "Manage roles and permissions",
};

export default function AdminRolesPage() {
  return <AdminRolesContent />;
}
