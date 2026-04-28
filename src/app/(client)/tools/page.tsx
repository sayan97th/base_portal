import type { Metadata } from "next";
import { Suspense } from "react";
import ToolsPage from "@/components/tools/ToolsPage";

export const metadata: Metadata = {
  title: "Tools | BASE Search Marketing",
  description: "SEO tools for your campaigns — coming soon.",
};

export default function Tools() {
  return (
    <Suspense>
      <ToolsPage />
    </Suspense>
  );
}
