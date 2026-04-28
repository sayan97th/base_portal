import type { Metadata } from "next";
import { Suspense } from "react";
import DashboardPage from "@/components/seo-dashboard/DashboardPage";

export const metadata: Metadata = {
  title: "BASE Search Marketing | Dashboard",
  description: "Client dashboard for BASE Search Marketing — manage orders, content services, and resources.",
};

export default function Dashboard() {
  return (
    <Suspense>
      <DashboardPage />
    </Suspense>
  );
}
