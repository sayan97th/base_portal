import { Suspense } from "react";
import PublicOrderPage from "@/components/order/PublicOrderPage";

export const metadata = {
  title: "Start Your Order",
};

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
        </div>
      }
    >
      <PublicOrderPage />
    </Suspense>
  );
}
