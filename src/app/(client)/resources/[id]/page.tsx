import type { Metadata } from "next";
import ResourceDetail from "@/components/resources/ResourceDetail";

export const metadata: Metadata = {
  title: "Resource Detail | BASE Search Marketing",
  description: "View and download files for this resource.",
};

export default function ResourceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <ResourceDetail resource_id={Number(params.id)} />;
}
