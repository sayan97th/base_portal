import type { Metadata } from "next";
import ClientCreditsPage from "@/components/credits/ClientCreditsPage";

export const metadata: Metadata = {
  title: "Credits | BASE Search Marketing",
  description: "View your available credits and transaction history.",
};

export default function Credits() {
  return <ClientCreditsPage />;
}
