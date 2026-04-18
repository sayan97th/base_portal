import type { Metadata } from "next";
import PremiumMentionsPage from "@/components/premium-mentions/PremiumMentionsPage";

export const metadata: Metadata = {
  title: "Premium Mentions | BASE Search Marketing",
  description:
    "Get featured on trusted news and editorial sites. Premium news placements to build brand credibility, strengthen entity signals, and support visibility across Google and AI Search.",
};

export default function PremiumMentions() {
  return <PremiumMentionsPage />;
}
