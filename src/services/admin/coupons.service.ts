import { apiClient } from "@/lib/api-client";
import type {
  Coupon,
  CouponDrTier,
  CreateCouponPayload,
  UpdateCouponPayload,
} from "@/types/admin/coupons";

export async function listAdminCoupons(): Promise<Coupon[]> {
  const response = await apiClient.get<{ data: Coupon[] }>("/api/admin/coupons");
  return response.data;
}

export async function getAdminCoupon(id: string): Promise<Coupon> {
  const response = await apiClient.get<{ data: Coupon }>(`/api/admin/coupons/${id}`);
  return response.data;
}

export async function createAdminCoupon(
  payload: CreateCouponPayload
): Promise<Coupon> {
  const response = await apiClient.post<{ data: Coupon }>("/api/admin/coupons", payload);
  return response.data;
}

export async function updateAdminCoupon(
  id: string,
  payload: UpdateCouponPayload
): Promise<Coupon> {
  const response = await apiClient.patch<{ data: Coupon }>(`/api/admin/coupons/${id}`, payload);
  return response.data;
}

export async function toggleAdminCouponStatus(
  id: string,
  is_active: boolean
): Promise<Coupon> {
  const response = await apiClient.patch<{ data: Coupon }>(`/api/admin/coupons/${id}`, { is_active });
  return response.data;
}

export async function deleteAdminCoupon(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/admin/coupons/${id}`);
}

/** Fetches all active DR tiers to populate the coupon form multi-select picker. */
export async function fetchCouponFormDrTiers(): Promise<CouponDrTier[]> {
  const response = await apiClient.get<{ data: CouponDrTier[] }>("/api/admin/dr-tiers");
  const tiers: CouponDrTier[] = Array.isArray(response)
    ? (response as unknown as CouponDrTier[])
    : (response as { data: CouponDrTier[] }).data ?? [];
  return tiers.filter((t) => t.is_active);
}

/**
 * Replaces the full set of DR tiers associated with an existing coupon.
 * Passing an empty array clears all tier associations.
 */
export async function syncCouponDrTiers(
  coupon_id: string,
  dr_tier_ids: string[]
): Promise<Coupon> {
  const response = await apiClient.patch<{ data: Coupon }>(
    `/api/admin/coupons/${coupon_id}`,
    { dr_tier_ids }
  );
  return response.data;
}

/**
 * Adds new DR tiers to an existing coupon, merging with already-associated tiers.
 */
export async function addDrTiersToCoupon(
  coupon: Coupon,
  new_dr_tier_ids: string[]
): Promise<Coupon> {
  const merged_ids = Array.from(
    new Set([...(coupon.dr_tier_ids ?? []), ...new_dr_tier_ids])
  );
  return syncCouponDrTiers(coupon.id, merged_ids);
}

/**
 * Removes a specific DR tier from a coupon's tier associations.
 */
export async function removeDrTierFromCoupon(
  coupon: Coupon,
  dr_tier_id: string
): Promise<Coupon> {
  const updated_ids = (coupon.dr_tier_ids ?? []).filter((id) => id !== dr_tier_id);
  return syncCouponDrTiers(coupon.id, updated_ids);
}
