import { apiClient } from "@/lib/api-client";
import type {
  Discount,
  DiscountDrTier,
  CreateDiscountPayload,
  UpdateDiscountPayload,
} from "@/types/admin/discounts";

export async function listAdminDiscounts(): Promise<Discount[]> {
  const response = await apiClient.get<{ data: Discount[] }>("/api/admin/discounts");
  return response.data;
}

export async function getAdminDiscount(id: string): Promise<Discount> {
  const response = await apiClient.get<{ data: Discount }>(`/api/admin/discounts/${id}`);
  return response.data;
}

export async function createAdminDiscount(
  payload: CreateDiscountPayload
): Promise<Discount> {
  const response = await apiClient.post<{ data: Discount }>("/api/admin/discounts", payload);
  return response.data;
}

export async function updateAdminDiscount(
  id: string,
  payload: UpdateDiscountPayload
): Promise<Discount> {
  const response = await apiClient.patch<{ data: Discount }>(`/api/admin/discounts/${id}`, payload);
  return response.data;
}

export async function toggleAdminDiscountStatus(
  id: string,
  is_active: boolean
): Promise<Discount> {
  const response = await apiClient.patch<{ data: Discount }>(`/api/admin/discounts/${id}`, { is_active });
  return response.data;
}

export async function deleteAdminDiscount(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/admin/discounts/${id}`);
}

/** Fetches all active, non-hidden DR tiers to populate the discount form picker. */
export async function fetchDiscountFormDrTiers(): Promise<DiscountDrTier[]> {
  const response = await apiClient.get<{ data: DiscountDrTier[] }>("/api/admin/dr-tiers");
  const tiers: DiscountDrTier[] = Array.isArray(response)
    ? (response as unknown as DiscountDrTier[])
    : (response as { data: DiscountDrTier[] }).data ?? [];
  return tiers.filter((t) => t.is_active);
}

/**
 * Replaces the full set of DR tiers associated with an existing discount.
 * Passing an empty array clears all tier associations.
 */
export async function syncDiscountDrTiers(
  discount_id: string,
  dr_tier_ids: string[]
): Promise<Discount> {
  const response = await apiClient.patch<{ data: Discount }>(
    `/api/admin/discounts/${discount_id}`,
    { dr_tier_ids }
  );
  return response.data;
}

/**
 * Applies a single discount to multiple DR tiers in one request.
 * Convenience wrapper around syncDiscountDrTiers that merges new IDs
 * with any already associated tiers on the given discount object.
 */
export async function applyDiscountToMultipleDrTiers(
  discount: Discount,
  new_dr_tier_ids: string[]
): Promise<Discount> {
  const merged_ids = Array.from(
    new Set([...(discount.dr_tier_ids ?? []), ...new_dr_tier_ids])
  );
  return syncDiscountDrTiers(discount.id, merged_ids);
}

/**
 * Removes a specific DR tier from a discount's tier associations.
 */
export async function removeDrTierFromDiscount(
  discount: Discount,
  dr_tier_id: string
): Promise<Discount> {
  const updated_ids = (discount.dr_tier_ids ?? []).filter((id) => id !== dr_tier_id);
  return syncDiscountDrTiers(discount.id, updated_ids);
}
