import type { SeoPackage } from "@/types/client/seo-packages";

export const seo_packages: SeoPackage[] = [
  {
    id: "growth-seo-plan",
    name: "Growth SEO Plan",
    slug: "growth",
    price_per_month: 1499,
    best_for: "Businesses looking to steadily build rankings over time.",
    is_most_popular: false,
    is_active: true,
    features: [
      {
        category: "Strategy",
        description: "Competitive research & strategy (Top 2 competitors every 6 months).",
      },
      {
        category: "On-Page",
        description: "2 optimized pages per month.",
      },
      {
        category: "Off-Page",
        description: "5 high-authority links per month.",
      },
      {
        category: "Technical",
        description: "Quick SEO health & technical checkup (every 6 months).",
      },
    ],
  },
  {
    id: "performance-seo-plan",
    name: "Performance SEO Plan",
    slug: "performance",
    price_per_month: 2999,
    best_for: "Companies looking for aggressive link-building and content expansion.",
    is_most_popular: true,
    is_active: true,
    features: [
      {
        category: "Strategy",
        description: "Competitive research & strategy (Top 3 competitors every 4 months).",
      },
      {
        category: "On-Page",
        description: "4 optimized pages per month.",
      },
      {
        category: "Off-Page",
        description: "10 high-authority links per month.",
      },
      {
        category: "Technical",
        description: "Full SEO tech audit & fixes (every 4 months).",
      },
    ],
  },
  {
    id: "full-scale-seo-plan",
    name: "Full-Scale SEO Plan",
    slug: "full-scale",
    price_per_month: 4999,
    best_for: "Brands that want to outrank competitors fast with a fully managed SEO powerhouse.",
    is_most_popular: false,
    is_active: true,
    features: [
      {
        category: "Strategy",
        description: "Advanced competitive research & strategy (Top 5 competitors every 3 months).",
      },
      {
        category: "On-Page",
        description: "8 optimized pages per month.",
      },
      {
        category: "Off-Page",
        description: "15 high-authority links per month.",
      },
      {
        category: "Technical",
        description: "Full SEO tech audit & fixes (every 3 months).",
      },
    ],
  },
];
