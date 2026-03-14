import type { Metadata } from "next";
import InvoiceDetailPage from "@/components/invoices/InvoiceDetailPage";

interface InvoiceDetailParams {
  params: Promise<{ invoice_id: string }>;
}

export async function generateMetadata({
  params,
}: InvoiceDetailParams): Promise<Metadata> {
  const { invoice_id } = await params;

  return {
    title: `Invoice ${invoice_id} | BASE Search Marketing`,
    description: `Invoice details for ${invoice_id}.`,
  };
}

export default async function InvoiceDetail({ params }: InvoiceDetailParams) {
  const { invoice_id } = await params;
  return <InvoiceDetailPage invoice_id={invoice_id} />;
}
