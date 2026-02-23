export interface ArticleTier {
  id: string;
  label: string;
  turnaround_time: string;
  price: number;
}

export const article_tiers: ArticleTier[] = [
  {
    id: "article_500",
    label: "500 Word Optimized SEO Article",
    turnaround_time: "6 Business Days",
    price: 300,
  },
  {
    id: "article_600",
    label: "600 Word Optimized SEO Article",
    turnaround_time: "6 Business Days",
    price: 330,
  },
  {
    id: "article_750",
    label: "750 Word Optimized SEO Article",
    turnaround_time: "6 Business Days",
    price: 425,
  },
  {
    id: "article_1000",
    label: "1,000 Word Optimized SEO Article",
    turnaround_time: "7 Business Days",
    price: 550,
  },
  {
    id: "article_1500",
    label: "1,500 Word Optimized SEO Article",
    turnaround_time: "7 Business Days",
    price: 775,
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
