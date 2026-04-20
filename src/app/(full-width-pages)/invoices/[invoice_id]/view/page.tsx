import { Suspense } from "react";
import PublicInvoiceViewClient from "./PublicInvoiceViewClient";

interface PageProps {
  params: Promise<{ invoice_id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function PublicInvoiceViewPage({
  params,
  searchParams,
}: PageProps) {
  const { invoice_id } = await params;
  const { token } = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
        </div>
      }
    >
      <PublicInvoiceViewClient invoice_id={invoice_id} token={token ?? ""} />
    </Suspense>
  );
}
