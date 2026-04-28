import type { Metadata } from "next";
import UnifiedStorePage from "@/components/store/UnifiedStorePage";

export const metadata: Metadata = {
  title: "Store | BASE Search Marketing",
  description:
    "Browse Link Building, New Content, Content Optimization, and Content Briefs — add multiple services to your cart and checkout in one step.",
};

export default function StorePage() {
  return <UnifiedStorePage />;
}
