import type { Metadata } from "next";
import BuyCreditsPage from "@/components/credits/BuyCreditsPage";

export const metadata: Metadata = {
  title: "Buy Credits | BASE Search Marketing",
  description: "Purchase credit bundles to use across BASE services at a 10% bulk discount.",
};

export default function BuyCredits() {
  return <BuyCreditsPage />;
}
