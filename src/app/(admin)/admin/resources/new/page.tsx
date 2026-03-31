import type { Metadata } from "next";
import ResourceFormPage from "@/components/admin/resources/ResourceFormPage";

export const metadata: Metadata = {
  title: "New Resource | Admin — BASE Search Marketing",
  description: "Create a new resource and attach files for clients.",
};

export default function NewResourcePage() {
  return <ResourceFormPage mode="create" />;
}
