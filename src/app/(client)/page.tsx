import type { Metadata } from "next";
import React from "react";
import ClientProfile from "@/components/seo-dashboard/ClientProfile";
import OrderHistory from "@/components/seo-dashboard/OrderHistory";
import NewsCard from "@/components/seo-dashboard/NewsCard";
import ResourcesCard from "@/components/seo-dashboard/ResourcesCard";
import OrderStatusTable from "@/components/seo-dashboard/OrderStatusTable";

export const metadata: Metadata = {
  title: "BASE Search Marketing | Client Dashboard",
  description: "SEO agency client dashboard for BASE Search Marketing",
};

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Client Profile with Tabs */}
      <ClientProfile />

      {/* Top Row: Order History + News + Resources */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 lg:col-span-5">
          <OrderHistory />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <NewsCard />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <ResourcesCard />
        </div>
      </div>

      {/* Full Width: Order Status Table */}
      <OrderStatusTable />
    </div>
  );
}
