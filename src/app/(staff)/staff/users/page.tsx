import type { Metadata } from "next";
import React from "react";
import StaffUsersContent from "@/components/staff/StaffUsersContent";

export const metadata: Metadata = {
  title: "Users | BASE Staff Portal",
  description: "Manage platform users",
};

export default function StaffUsersPage() {
  return <StaffUsersContent />;
}
