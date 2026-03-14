import type { Metadata } from "next";
import InvoicesPage from "@/components/invoices/InvoicesPage";

export const metadata: Metadata = {
  title: "Invoices | BASE Search Marketing",
  description: "View and manage your invoices and payment history.",
};

export default function Invoices() {
  return <InvoicesPage />;
}
