import type { Metadata } from "next";
import ContentOptimizationsPage from "@/components/content-optimizations/ContentOptimizationsPage";

export const metadata: Metadata = {
  title: "Content Optimizations | BASE Search Marketing",
  description:
    "SEO Content Optimizations - Revive published content pieces with keyword inclusion, semantic analysis, and SERP-based recommendations.",
};

export default function ContentOptimizations() {
  return <ContentOptimizationsPage />;
}
