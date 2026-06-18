import type { Metadata } from "next";
import React from "react";
import AdminTransactionsContent from "@/components/admin/transactions/AdminTransactionsContent";

export const metadata: Metadata = {
  title: "Transactions | BASE Admin Portal",
  description: "View all payment transactions recorded on the platform",
};

export default function AdminTransactionsPage() {
  return <AdminTransactionsContent />;
}
