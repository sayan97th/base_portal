interface CardBrandIconProps {
  card_brand: string | null | undefined;
  size?: "sm" | "md";
}

const BRAND_STYLES: Record<string, { text: string; class_name: string }> = {
  visa: { text: "VISA", class_name: "bg-[#1a1f71] text-white italic" },
  mastercard: { text: "MC", class_name: "bg-[#eb001b] text-white" },
  amex: { text: "AMEX", class_name: "bg-[#2e77bc] text-white" },
  american_express: { text: "AMEX", class_name: "bg-[#2e77bc] text-white" },
  discover: { text: "DISC", class_name: "bg-[#ff6000] text-white" },
  diners: { text: "DC", class_name: "bg-[#0079be] text-white" },
  jcb: { text: "JCB", class_name: "bg-[#0b4ea2] text-white" },
  unionpay: { text: "UP", class_name: "bg-[#e21836] text-white" },
};

export default function CardBrandIcon({ card_brand, size = "md" }: CardBrandIconProps) {
  const brand_style = BRAND_STYLES[(card_brand ?? "").toLowerCase()];
  const size_class = size === "sm" ? "h-5 w-8 text-[8px]" : "h-7 w-11 text-[10px]";

  if (!brand_style) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-400 ${size_class}`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-bold tracking-wide ${brand_style.class_name} ${size_class}`}
    >
      {brand_style.text}
    </span>
  );
}
