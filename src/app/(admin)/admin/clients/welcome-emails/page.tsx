import type { Metadata } from "next";
import React from "react";
import AdminWelcomeEmailsContent from "@/components/admin/clients/AdminWelcomeEmailsContent";

export const metadata: Metadata = {
  title: "Welcome Emails | BASE Admin Portal",
  description: "Send platform welcome emails with password-reset links to clients.",
};

export default function AdminWelcomeEmailsPage() {
  return <AdminWelcomeEmailsContent />;
}
