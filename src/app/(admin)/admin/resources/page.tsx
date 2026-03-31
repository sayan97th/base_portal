import type { Metadata } from "next";
import AdminResourcesContent from "@/components/admin/resources/AdminResourcesContent";

export const metadata: Metadata = {
  title: "Resources | Admin — BASE Search Marketing",
  description: "Manage documents and files shared with client organizations.",
};

export default function AdminResourcesPage() {
  return <AdminResourcesContent />;
}
