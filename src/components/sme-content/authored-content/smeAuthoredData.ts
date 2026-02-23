export interface SmeAuthoredTier {
  id: string;
  label: string;
  description: string;
  price: number;
}

export const sme_authored_tiers: SmeAuthoredTier[] = [
  {
    id: "sme_authored_1000_1499",
    label: "SME Authored Content - 1,000-1,499 Words",
    description:
      "Industry experts with verified credentials create comprehensive content from research to final delivery with editorial oversight.",
    price: 2000,
  },
  {
    id: "sme_authored_1500_1999",
    label: "SME Authored Content - 1,500-1,999 Words",
    description:
      "Industry experts with verified credentials create comprehensive content from research to final delivery with editorial oversight.",
    price: 3000,
  },
  {
    id: "sme_authored_2000_plus",
    label: "SME Authored Content - 2,000+ Words",
    description:
      "Industry experts with verified credentials create comprehensive content from research to final delivery with editorial oversight.",
    price: 4000,
  },
];

export const sme_authored_features: string[] = [
  "Comprehensive content creation from research to final delivery",
  "Editorial oversight ensuring quality and brand alignment",
  "Content that demonstrates genuine expertise Google rewards",
];

export const content_types: string[] = [
  "Home Page",
  "About Us Page",
  "Blog Article",
  "Product page",
];
