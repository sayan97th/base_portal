"use client";
import React, { useState } from "react";

const tabs = ["OVERVIEW", "PRODUCTS", "RESOURCES", "TOOLS"];

export default function ClientProfile() {
  const [activeTab, setActiveTab] = useState("OVERVIEW");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Client Info */}
      <div className="flex items-center gap-4 px-5 pt-5 sm:px-6 sm:pt-6">

        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Actian
          </h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex border-b border-gray-200 px-5 dark:border-gray-800 sm:px-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab
              ? "border-b-2 border-coral-500 text-coral-500"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
