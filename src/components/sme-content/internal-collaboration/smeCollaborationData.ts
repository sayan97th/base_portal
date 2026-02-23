export interface SmeServiceTier {
  id: string;
  label: string;
  description: string;
  price: number;
}

export const sme_service_tiers: SmeServiceTier[] = [
  {
    id: "sme_1000_1499",
    label: "Internal SME Content Collaboration - 1,000-1,499 Words",
    description:
      "We interview your company's internal experts and transform their insights into polished, audience-ready content.",
    price: 750,
  },
  {
    id: "sme_1500_1999",
    label: "Internal SME Content Collaboration - 1,500-1,999 Words",
    description:
      "We interview your company's internal experts and transform their insights into polished, audience-ready content.",
    price: 1250,
  },
  {
    id: "sme_2000_plus",
    label: "Internal SME Content Collaboration - 2,000+ Words",
    description:
      "We interview your company's internal experts and transform their insights into polished, audience-ready content.",
    price: 1500,
  },
];

export const sme_features: string[] = [
  "Expert knowledge extraction through structured interviews",
  "Transformation of technical insights into engaging content",
  "Preservation of authentic voice and specialized knowledge",
  "Content optimized for both accuracy and audience engagement",
];

export const content_types: string[] = [
  "Home Page",
  "About Us Page",
  "Blog Article",
  "Product page",
];
