import BillingPage from "@/components/billing/BillingPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing | BASE Portal",
  description: "Manage your billing information and payment methods.",
};

export default function Billing() {
  return <BillingPage />;
}
