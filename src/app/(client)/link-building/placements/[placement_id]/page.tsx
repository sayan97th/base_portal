import type { Metadata } from "next";
import { Suspense } from "react";
import PlacementDetailPage from "@/components/link-building/PlacementDetailPage";

interface PlacementDetailParams {
  params: Promise<{ placement_id: string }>;
}

export async function generateMetadata({
  params,
}: PlacementDetailParams): Promise<Metadata> {
  const { placement_id } = await params;
  return {
    title: `Placement ${placement_id.slice(0, 8).toUpperCase()} | BASE Search Marketing`,
    description: "View the details of your link building placement.",
  };
}

export default async function PlacementDetailRoute({
  params,
}: PlacementDetailParams) {
  const { placement_id } = await params;
  return (
    <Suspense>
      <PlacementDetailPage placement_id={placement_id} />
    </Suspense>
  );
}
