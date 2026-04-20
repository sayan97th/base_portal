import { Suspense } from "react";
import PublicInvoicePayClient from "./PublicInvoicePayClient";

interface PageProps {
  params: Promise<{ invoice_id: string }>;
  searchParams: Promise<{ token?: string; status?: string }>;
}

export default async function PublicInvoicePayPage({
  params,
  searchParams,
}: PageProps) {
  const { invoice_id } = await params;
  const { token } = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
        </div>
      }
    >
      <PublicInvoicePayClient invoice_id={invoice_id} token={token ?? ""} />
    </Suspense>
  );
}
