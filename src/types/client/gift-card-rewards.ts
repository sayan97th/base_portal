/**
 * Money back promo codes (for example HAPPYHOLIDAYS): the client pays the
 * regular price and receives a gift card worth a percentage of the order.
 */

export type GiftCardBrand = "amazon" | "visa" | "target";

export type GiftCardRewardStatus = "pending_details" | "submitted" | "fulfilled";

export interface GiftCardBrandOption {
  value: GiftCardBrand;
  label: string;
}

/** Fallback list, the API sends the same options with every reward. */
export const GIFT_CARD_BRAND_OPTIONS: GiftCardBrandOption[] = [
  { value: "amazon", label: "Amazon" },
  { value: "visa", label: "Visa" },
  { value: "target", label: "Target" },
];

/** Gift card details collected from the client. */
export interface GiftCardRewardDetails {
  recipient_email: string;
  gift_card_brand: GiftCardBrand | "";
}

export interface GiftCardReward {
  id: string;
  session_id: string;
  order_ids: string[];
  coupon_code: string;
  promotion_name: string;
  order_total: number;
  reward_percentage: number;
  reward_amount: number;
  recipient_email: string | null;
  gift_card_brand: GiftCardBrand | null;
  status: GiftCardRewardStatus;
  /** True while the client can still fill in the form (pending + promo running). */
  is_claimable: boolean;
  /** Exact moment the promo stops working (ISO 8601). */
  promotion_ends_at: string | null;
  /** Last day the promo code works (Y-m-d). The whole day is included. */
  promotion_last_day?: string | null;
  submitted_at: string | null;
  fulfilled_at: string | null;
  brands: GiftCardBrandOption[];
}

export interface SubmitGiftCardRewardPayload {
  recipient_email: string;
  gift_card_brand: GiftCardBrand;
}

export interface GiftCardRewardLookupParams {
  session_id?: string;
  order_id?: string;
}

/** Money back promo codes (HAPPYHOLIDAYS) are flagged by the API or by their discount type. */
export function isGiftCardRewardCoupon(coupon: {
  discount_type: string;
  is_gift_card_reward?: boolean;
}): boolean {
  return coupon.is_gift_card_reward === true || coupon.discount_type === "gift_card_reward";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidGiftCardEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

/** True when both fields are filled in with valid values. */
export function isGiftCardRewardDetailsComplete(
  details: GiftCardRewardDetails | null | undefined
): details is { recipient_email: string; gift_card_brand: GiftCardBrand } {
  return (
    !!details &&
    isValidGiftCardEmail(details.recipient_email) &&
    GIFT_CARD_BRAND_OPTIONS.some((option) => option.value === details.gift_card_brand)
  );
}

export function formatRewardPercentage(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}
