import type { Metadata } from "next";
import ResourceFormPage from "@/components/admin/resources/ResourceFormPage";

export const metadata: Metadata = {
  title: "Edit Resource | Admin — BASE Search Marketing",
  description: "Update resource details and manage attached files.",
};

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResourceFormPage mode="edit" resource_id={Number(id)} />;
}
