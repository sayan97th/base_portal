import { apiClient } from "@/lib/api-client";
import type {
  AdminGiftCardClaim,
  AdminGiftCardClaimFilters,
  CouponGiftCardClaimsResponse,
} from "@/types/admin/coupons";

/** GET /api/admin/gift-card-claims */
export async function listAdminGiftCardClaims(
  filters: AdminGiftCardClaimFilters = {}
): Promise<AdminGiftCardClaim[]> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, String(value));
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await apiClient.get<{ data: AdminGiftCardClaim[] }>(
    `/api/admin/gift-card-claims${suffix}`
  );
  return response.data;
}

/** PATCH /api/admin/gift-card-claims/{id}/fulfillment */
export async function updateAdminGiftCardClaimFulfillment(
  id: string,
  is_fulfilled: boolean
): Promise<AdminGiftCardClaim> {
  const response = await apiClient.patch<{ data: AdminGiftCardClaim }>(
    `/api/admin/gift-card-claims/${id}/fulfillment`,
    { is_fulfilled }
  );
  return response.data;
}

/**
 * GET /api/admin/coupons/{id}/gift-card-claims
 * Every gift card request of one coupon (not capped) plus its totals.
 */
export async function getAdminCouponGiftCardClaims(coupon_id: string): Promise<CouponGiftCardClaimsResponse> {
  return apiClient.get<CouponGiftCardClaimsResponse>(`/api/admin/coupons/${coupon_id}/gift-card-claims`);
}
