import type { Metadata } from "next";
import LinkBuildingPage from "@/components/link-building/LinkBuildingPage";

export const metadata: Metadata = {
  title: "Link Building | BASE Search Marketing",
  description:
    "Order high-quality backlinks across multiple DR tiers with original content, dofollow links, and 30-day turnaround.",
};

export default function LinkBuilding() {
  return <LinkBuildingPage />;
}
