"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const tabs = ["OVERVIEW", "PRODUCTS", "RESOURCES", "TOOLS"];

const tab_content: Record<string, React.ReactNode> = {
  OVERVIEW: null,
  PRODUCTS: (
    <div className="flex flex-wrap gap-2 px-5 py-4 sm:px-6">
      {["Link Building", "SME Authored", "Enhanced Content", "Internal Collaboration"].map(
        (product) => (
          <span
            key={product}
            className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300"
          >
            {product}
          </span>
        )
      )}
    </div>
  ),
  RESOURCES: (
    <div className="flex flex-wrap gap-3 px-5 py-4 sm:px-6">
      {[
        { label: "Knowledge Base", href: "#" },
        { label: "SEO Guides", href: "#" },
        { label: "Case Studies", href: "#" },
      ].map((item) => (
        <a
          key={item.label}
          href={item.href}
          className="flex items-center gap-1.5 text-sm text-coral-500 hover:text-coral-600 hover:underline"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 7h10M7 2l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {item.label}
        </a>
      ))}
    </div>
  ),
  TOOLS: (
    <div className="flex flex-wrap gap-3 px-5 py-4 sm:px-6">
      {[
        { label: "Order Report", href: "#" },
        { label: "Keyword Tracker", href: "#" },
      ].map((item) => (
        <a
          key={item.label}
          href={item.href}
          className="flex items-center gap-1.5 text-sm text-coral-500 hover:text-coral-600 hover:underline"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 7h10M7 2l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {item.label}
        </a>
      ))}
    </div>
  ),
};

export default function ClientProfile() {
  const [active_tab, setActiveTab] = useState("OVERVIEW");
  const { user } = useAuth();

  const org_name =
    user?.organization?.name ??
    (user ? `${user.first_name} ${user.last_name}`.trim() : "Client");

  const initials = org_name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w.charAt(0).toUpperCase())
    .join("");

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      {/* Client Info Row */}
      <div className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-3">
          {/* Logo / Initials Avatar */}
          {user?.organization?.icon_light ? (
            <img
              src={user.organization.icon_light}
              alt={org_name}
              className="h-11 w-11 rounded-xl object-contain"
            />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-coral-500 text-base font-bold text-white">
              {initials || "C"}
            </span>
          )}

          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {org_name}
            </h2>
            {user?.email && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* Quick Action */}
        <Link
          href="/link-building"
          className="hidden items-center gap-2 rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-600 sm:flex"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 2v10M2 7h10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Place Order
        </Link>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex border-b border-gray-200 px-5 dark:border-gray-800 sm:px-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              active_tab === tab
                ? "border-b-2 border-coral-500 text-coral-500"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content (all tabs except OVERVIEW show a small panel) */}
      {active_tab !== "OVERVIEW" && tab_content[active_tab]}
    </div>
  );
}
