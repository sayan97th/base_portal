import type { Metadata } from "next";
import React from "react";
import StaffDashboardContent from "@/components/staff/StaffDashboardContent";

export const metadata: Metadata = {
  title: "BASE Search Marketing | Staff Dashboard",
  description: "Internal staff dashboard for BASE Search Marketing team",
};

export default function StaffDashboardPage() {
  return <StaffDashboardContent />;
}
