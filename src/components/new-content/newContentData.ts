import type { NewContentTier } from "@/types/client/new-content";

export const new_content_tiers: NewContentTier[] = [
  {
    id: "article_500",
    label: "500 Word Optimized SEO Article",
    turnaround_time: "6 Business Days",
    price: 300,
    is_active: true,
    is_most_popular: false,
    max_quantity: null,
    is_hidden: false,
    sort_order: 1,
  },
  {
    id: "article_600",
    label: "600 Word Optimized SEO Article",
    turnaround_time: "6 Business Days",
    price: 330,
    is_active: true,
    is_most_popular: false,
    max_quantity: null,
    is_hidden: false,
    sort_order: 2,
  },
  {
    id: "article_750",
    label: "750 Word Optimized SEO Article",
    turnaround_time: "6 Business Days",
    price: 425,
    is_active: true,
    is_most_popular: true,
    max_quantity: null,
    is_hidden: false,
    sort_order: 3,
  },
  {
    id: "article_1000",
    label: "1,000 Word Optimized SEO Article",
    turnaround_time: "7 Business Days",
    price: 550,
    is_active: true,
    is_most_popular: false,
    max_quantity: null,
    is_hidden: false,
    sort_order: 4,
  },
  {
    id: "article_1500",
    label: "1,500 Word Optimized SEO Article",
    turnaround_time: "7 Business Days",
    price: 775,
    is_active: true,
    is_most_popular: false,
    max_quantity: null,
    is_hidden: false,
    sort_order: 5,
  },
];

export const article_features: string[] = [
  "Focus keyword inclusion",
  "Semantic analysis keyword inclusion",
  "People also ask questions review",
  "Title tag optimization",
  "H1 tag optimization",
  "1-3 topic coverage",
  "2 Revisions",
];

export const content_types: string[] = [
  "Home Page",
  "About Us Page",
  "Blog Article",
  "Product page",
];
