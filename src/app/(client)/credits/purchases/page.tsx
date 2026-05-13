import type { Metadata } from "next";
import CreditPurchasesPage from "@/components/credits/CreditPurchasesPage";

export const metadata: Metadata = {
  title: "Credit Purchase History | BASE Search Marketing",
  description: "View all your credit purchases and payment history.",
};

export default function CreditPurchases() {
  return <CreditPurchasesPage />;
}
