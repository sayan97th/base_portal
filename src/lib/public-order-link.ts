import type { CartProductType } from "@/types/client/unified-cart";

/**
 * Contract for the link the marketing site (basesearchmarketing.com) hands off
 * to the portal once the visitor clicks "Continue" on their cart. The portal
 * never re-validates unit_price against a live tier catalog before charging,
 * matching the trust model already used by the existing authenticated
 * checkout (which relies on server-side Stripe PaymentIntent amount
 * verification, not per-item price lookups).
 */
export interface PublicOrderCartItem {
  product_type: CartProductType;
  tier_id: string;
  tier_name: string;
  unit_price: number;
  quantity: number;
}

const VALID_PRODUCT_TYPES: CartProductType[] = [
  "link_building",
  "content_optimization",
  "new_content",
  "content_brief",
];

function toBase64Url(input: string): string {
  const base64 =
    typeof window === "undefined"
      ? Buffer.from(input, "utf-8").toString("base64")
      : btoa(unescape(encodeURIComponent(input)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const base64 = padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "=");
  return typeof window === "undefined"
    ? Buffer.from(base64, "base64").toString("utf-8")
    : decodeURIComponent(escape(atob(base64)));
}

export function encodePublicOrderCart(items: PublicOrderCartItem[]): string {
  return toBase64Url(JSON.stringify(items));
}

/**
 * Decodes the `cart` query param into a validated item list. Malformed or
 * unrecognized entries are dropped rather than trusted, since this data
 * arrives from an external (unauthenticated) source.
 */
export function decodePublicOrderCart(param: string | null): PublicOrderCartItem[] {
  if (!param) return [];

  try {
    const decoded = fromBase64Url(param);
    const parsed = JSON.parse(decoded);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is PublicOrderCartItem => {
      if (!entry || typeof entry !== "object") return false;
      const item = entry as Record<string, unknown>;

      return (
        typeof item.product_type === "string" &&
        VALID_PRODUCT_TYPES.includes(item.product_type as CartProductType) &&
        typeof item.tier_id === "string" &&
        item.tier_id.length > 0 &&
        typeof item.tier_name === "string" &&
        item.tier_name.length > 0 &&
        typeof item.unit_price === "number" &&
        item.unit_price >= 0 &&
        typeof item.quantity === "number" &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
      );
    });
  } catch {
    return [];
  }
}
