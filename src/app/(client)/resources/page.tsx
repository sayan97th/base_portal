import { Suspense } from "react";
import type { Metadata } from "next";
import ResourcesPage from "@/components/resources/ResourcesPage";

export const metadata: Metadata = {
  title: "Resources | BASE Search Marketing",
  description: "Access documents, reports, and files shared with your account.",
};

export default function Resources() {
  return (
    <Suspense>
      <ResourcesPage />
    </Suspense>
  );
}
