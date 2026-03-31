import type { Metadata } from "next";
import ResourceDetail from "@/components/resources/ResourceDetail";

export const metadata: Metadata = {
  title: "Resource Detail | BASE Search Marketing",
  description: "View and download files for this resource.",
};

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ResourceDetail resource_id={Number(id)} />;
}
