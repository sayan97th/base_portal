import React from "react";

const BRAND_STYLES: Record<string, { gradient: string; label: string }> = {
  visa:       { gradient: "from-blue-700 to-blue-500",     label: "VISA" },
  mastercard: { gradient: "from-gray-800 to-gray-600",     label: "MC" },
  amex:       { gradient: "from-sky-600 to-cyan-500",      label: "AMEX" },
  discover:   { gradient: "from-orange-500 to-amber-400",  label: "DISC" },
};

interface CardBrandThumbProps {
  card_brand: string;
  last_four: string;
  is_muted?: boolean;
}

/** Small credit-card illustration used in the saved card lists. */
export default function CardBrandThumb({ card_brand, last_four, is_muted = false }: CardBrandThumbProps) {
  const brand_style = BRAND_STYLES[card_brand?.toLowerCase()] ?? {
    gradient: "from-gray-600 to-gray-400",
    label: (card_brand || "CARD").toUpperCase().slice(0, 4),
  };

  return (
    <div
      className={`relative flex h-9 w-14 shrink-0 flex-col justify-between overflow-hidden rounded-md bg-linear-to-br p-1.5 shadow-sm ${brand_style.gradient} ${
        is_muted ? "opacity-50 grayscale" : ""
      }`}
      aria-hidden="true"
    >
      <div className="h-1.5 w-2.5 rounded-xs bg-yellow-300/90" />
      <div className="flex items-end justify-between">
        <span className="text-[7px] font-medium leading-none text-white/90">•••• {last_four}</span>
        <span className="text-[7px] font-bold italic leading-none text-white">{brand_style.label}</span>
      </div>
    </div>
  );
}
