export interface SmeEnhancedTier {
  id: string;
  label: string;
  description: string;
  price: number;
}

export const sme_enhanced_tiers: SmeEnhancedTier[] = [
  {
    id: "sme_enhanced_1000",
    label: "SME Enhanced Content - 1,000-1,499 Words",
    description:
      "We write the content and have a qualified SME review it for technical accuracy and put their name on the article.",
    price: 1500,
  },
  {
    id: "sme_enhanced_1500",
    label: "SME Enhanced Content - 1,500-1,999 Words",
    description:
      "We write the content and have a qualified SME review it for technical accuracy and put their name on the article.",
    price: 2500,
  },
  {
    id: "sme_enhanced_2000",
    label: "SME Enhanced Content - 2,000+ Words",
    description:
      "We write the content and have a qualified SME review it for technical accuracy and put their name on the article.",
    price: 3500,
  },
];
