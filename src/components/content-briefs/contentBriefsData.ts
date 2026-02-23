export interface BriefTier {
  id: string;
  label: string;
  turnaround_time: string;
  price: number;
}

export const brief_tiers: BriefTier[] = [
  {
    id: "content_brief_outline",
    label: "Content Brief/Outline",
    turnaround_time: "5 Business Days",
    price: 99,
  },
];

export const brief_features: string[] = [
  "Focus keyword recommendations",
  "Semantic analysis terms",
  "Word count recommendations",
  "H1 recommendation",
  "Title tag recommendation",
  "Meta description recommendation",
  "People Also Ask questions review",
  "Suggested outline based on top ranking pages",
];
