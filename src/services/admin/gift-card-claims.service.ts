import { apiClient } from "@/lib/api-client";
import type { AdminGiftCardClaim, AdminGiftCardClaimFilters } from "@/types/admin/coupons";

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
