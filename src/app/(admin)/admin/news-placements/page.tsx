import type { Metadata } from "next";
import React from "react";
import NewsPlacementsTable from "@/components/admin/news-placements/NewsPlacementsTable";

export const metadata: Metadata = {
  title: "BASE Search Marketing | News Placements Database",
  description: "Premium News Placements domain database for BASE Search Marketing team",
};

export default function NewsPlacementsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          News Placements Database
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Domain database for Premium News Placements. Keep this database up to date — the BASE team uses it to find the right domains for client link orders.
        </p>
      </div>
      <NewsPlacementsTable />
    </div>
  );
}
