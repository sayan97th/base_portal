/**
 * Promo code rules shared by the cart and checkout.
 *
 * Only one promo code can be applied per order. Promo codes never stack,
 * whatever their type (percentage, fixed amount or money back). The backend
 * enforces the same rule (Coupon::MAX_PER_ORDER) and answers with the same
 * copy, so the client always sees one consistent message.
 */
export const MAX_PROMO_CODES_PER_ORDER = 1;

export const PROMO_COMBINATION_ERROR_MESSAGE = "This promo cannot be combined with other offers.";

/**
 * Keeps at most MAX_PROMO_CODES_PER_ORDER promo codes. Used when restoring a
 * saved cart, so a snapshot saved before this rule existed can never bring
 * back stacked promo codes.
 */
export function limitToSinglePromoCode<T>(applied_coupons: T[] | null | undefined): T[] {
  return (applied_coupons ?? []).slice(0, MAX_PROMO_CODES_PER_ORDER);
}

/** Minimum fields of a discount record needed to apply the stacking rule. */
interface PromoCodeStackingConfig {
  allow_promo_code_stacking?: boolean;
}

/**
 * Promotions do not stack by default: an applied promo code (price discount
 * or money back) removes the automatic discounts, for example the Bulk Link
 * Building Discount, from the order.
 *
 * When the admin enables "allow_promo_code_stacking" on a discount record,
 * the client gets both that discount and the promo code.
 *
 * Mirrors Discount::resolveBulkDiscount on the API.
 */
export function isDiscountBlockedByPromoCode(
  config: PromoCodeStackingConfig,
  has_promo_code: boolean
): boolean {
  return has_promo_code && config.allow_promo_code_stacking !== true;
}
