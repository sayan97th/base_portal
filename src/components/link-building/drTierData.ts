export interface DrTier {
  id: string;
  dr_label: string;
  traffic_range: string;
  word_count: number;
  price_per_link: number;
  is_most_popular: boolean;
}

export const dr_tiers: DrTier[] = [
  {
    id: "dr_30",
    dr_label: "DR 30+",
    traffic_range: "800-5,000+",
    word_count: 650,
    price_per_link: 260,
    is_most_popular: false,
  },
  {
    id: "dr_40",
    dr_label: "DR 40+",
    traffic_range: "1,000-5,000+",
    word_count: 700,
    price_per_link: 315,
    is_most_popular: true,
  },
  {
    id: "dr_50",
    dr_label: "DR 50+",
    traffic_range: "1,500-5,000+",
    word_count: 700,
    price_per_link: 400,
    is_most_popular: false,
  },
  {
    id: "dr_60",
    dr_label: "DR 60+",
    traffic_range: "2,000-10,000+",
    word_count: 700,
    price_per_link: 475,
    is_most_popular: false,
  },
  {
    id: "dr_70",
    dr_label: "DR 70+",
    traffic_range: "3,000-10,000+",
    word_count: 700,
    price_per_link: 630,
    is_most_popular: false,
  },
];

export const shared_features: string[] = [
  "Original Content",
  "Indexed Regularly",
  "DoFollow Links",
  "30-Day Turnaround Time",
];
