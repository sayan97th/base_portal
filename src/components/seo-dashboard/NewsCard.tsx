import React from "react";

interface NewsItem {
  id: number;
  icon: "promo" | "blog" | "tip";
  title: string;
  description: string;
  color: string;
}

const newsItems: NewsItem[] = [
  {
    id: 1,
    icon: "promo",
    title: "February Promo",
    description: "14% off this week only",
    color: "bg-success-500",
  },
  {
    id: 2,
    icon: "blog",
    title: "New Blog Post",
    description: "Tips to help you get found in local search",
    color: "bg-blue-light-500",
  },
  {
    id: 3,
    icon: "tip",
    title: "SEO Tip",
    description: "AI tools don't see your meta descriptions",
    color: "bg-warning-500",
  },
];

function NewsIcon({ type }: { type: NewsItem["icon"] }) {
  if (type === "promo") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 1L10.2 5.4L15 6.1L11.5 9.5L12.3 14.3L8 12L3.7 14.3L4.5 9.5L1 6.1L5.8 5.4L8 1Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (type === "blog") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M2 3H14V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
        />
        <path d="M2 3H14V5H2V3Z" fill="currentColor" />
        <path
          d="M4 7H8M4 9.5H10"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2V14M8 2L4.5 5.5M8 2L11.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function NewsCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        News
      </h3>

      <div className="flex flex-col gap-4 sm:flex-row">
        {/* Featured Image Area - Left */}
        <div className="relative flex h-40 flex-1 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 sm:h-auto">
          <div className="text-center text-white">
            <p className="text-2xl font-bold">14% Off</p>
            <p className="text-sm">All Services</p>
          </div>
        </div>

        {/* News Items - Right */}
        <div className="flex-1 space-y-3">
          {newsItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3"
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${item.color} text-white`}
              >
                <NewsIcon type={item.icon} />
              </span>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                  {item.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
