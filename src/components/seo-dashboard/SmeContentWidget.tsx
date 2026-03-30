"use client";
import React from "react";
import Link from "next/link";

interface SmeService {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  price_range: string;
  href: string;
  badge?: string;
  tiers: { label: string; price: string }[];
  icon: React.ReactNode;
  accent: string;
  accent_bg: string;
}

const sme_services: SmeService[] = [
  {
    id: "authored",
    title: "SME Authored",
    subtitle: "Content Creation",
    description:
      "Industry experts with verified credentials create comprehensive content from research to final delivery with full editorial oversight.",
    price_range: "$2,000 – $4,000",
    href: "/sme-content/authored-content",
    badge: "Most Popular",
    tiers: [
      { label: "1,000–1,499 words", price: "$2,000" },
      { label: "1,500–1,999 words", price: "$3,000" },
      { label: "2,000+ words", price: "$4,000" },
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path
          d="M3 5h16M3 9h16M3 13h10"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="17" cy="16" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M15.5 16l1 1 2-2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    accent: "text-coral-500",
    accent_bg: "bg-coral-50 dark:bg-coral-500/10",
  },
  {
    id: "enhanced",
    title: "Enhanced Content",
    subtitle: "Content Upgrade",
    description:
      "Transform existing content into high-performing assets. Our team enhances structure, depth, and SEO signals to boost rankings.",
    price_range: "$1,500 – $3,500",
    href: "/sme-content/enhanced-content",
    tiers: [
      { label: "1,000–1,499 words", price: "$1,500" },
      { label: "1,500–1,999 words", price: "$2,500" },
      { label: "2,000+ words", price: "$3,500" },
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path
          d="M4 17l4-4 3 3 5-6 4 4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 5h3v3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    accent: "text-blue-light-500",
    accent_bg: "bg-blue-light-100 dark:bg-blue-light-500/20",
  },
  {
    id: "collaboration",
    title: "Internal Collaboration",
    subtitle: "Interview-Based",
    description:
      "We interview your internal subject matter experts and transform those insights into polished, authoritative content pieces.",
    price_range: "$750 – $1,500",
    href: "/sme-content/internal-collaboration",
    tiers: [
      { label: "1,000–1,499 words", price: "$750" },
      { label: "1,500–1,999 words", price: "$1,250" },
      { label: "2,000+ words", price: "$1,500" },
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="8" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="15" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M2 18c0-3.314 2.686-5 6-5s6 1.686 6 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M15 13c2 0 4 1 4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
    accent: "text-success-500",
    accent_bg: "bg-success-100 dark:bg-success-500/20",
  },
];

export default function SmeContentWidget() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-6 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            SME Content Services
          </h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Expert-driven content that Google rewards
          </p>
        </div>
        <Link
          href="/sme-content/authored-content"
          className="hidden text-sm font-medium text-coral-500 hover:text-coral-600 sm:block"
        >
          View All Services →
        </Link>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {sme_services.map((service) => (
          <div
            key={service.id}
            className="group relative flex flex-col rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all hover:border-gray-200 hover:shadow-sm dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-gray-700"
          >
            {/* Badge */}
            {service.badge && (
              <span className="absolute right-3 top-3 rounded-full bg-coral-500 px-2 py-0.5 text-xs font-semibold text-white">
                {service.badge}
              </span>
            )}

            {/* Icon + Title */}
            <div className="mb-3 flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${service.accent_bg} ${service.accent}`}
              >
                {service.icon}
              </span>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white/90">
                  {service.title}
                </p>
                <p className={`text-xs font-medium ${service.accent}`}>
                  {service.subtitle}
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="mb-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
              {service.description}
            </p>

            {/* Pricing Tiers */}
            <div className="mb-4 space-y-1.5">
              {service.tiers.map((tier) => (
                <div
                  key={tier.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {tier.label}
                  </span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {tier.price}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-auto">
              <Link
                href={service.href}
                className={`flex w-full items-center justify-center rounded-lg border px-4 py-2 text-xs font-semibold uppercase transition-colors ${
                  service.id === "authored"
                    ? "border-coral-500 bg-coral-500 text-white hover:bg-coral-600"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5"
                }`}
              >
                Order Now
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
        All content services include editorial review and brand alignment checks.
        Coupons and bulk discounts available at checkout.
      </p>
    </div>
  );
}
