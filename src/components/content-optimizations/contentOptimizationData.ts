export interface OptimizationTier {
  id: string;
  label: string;
  turnaround_time: string;
  price: number;
}

export const optimization_tiers: OptimizationTier[] = [
  {
    id: "optimization_0_799",
    label: "Current Content Word Count 0-799",
    turnaround_time: "5 Days",
    price: 220,
  },
  {
    id: "optimization_800_1599",
    label: "Current Content Word Count 800-1,599",
    turnaround_time: "7 Days",
    price: 275,
  },
  {
    id: "optimization_1600_plus",
    label: "Current Content Word Count 1,600+",
    turnaround_time: "9 Days",
    price: 440,
  },
];

export const optimization_features: string[] = [
  "Focus keyword inclusion",
  "Semantic analysis terms inclusion",
  "Word count adjustment based on SERP recommendations",
  "H1 optimization",
  "Title tag optimization",
  "Meta description optimization",
  "People also ask questions addressed",
];

export const how_to_order_steps: string[] = [
  "Choose a content piece on your site that you would like optimized.",
  "Copy and paste your content into {tool_link} to calculate the total number of words your content piece has.",
  "**Choose the option below based on the number of words your content piece currently has.**",
  "Checkout.",
  "Fill out the intake form with your target keyword and the content page's URL.",
];
