import { apiClient } from "@/lib/api-client";
import type { Discount } from "@/types/admin/discounts";

export async function getActiveDiscounts(): Promise<Discount[]> {
  const response = await apiClient.get<{ data: Discount[] }>("/api/discounts/active");
  return response.data;
}

export async function getActiveBulkDiscount(): Promise<Discount | null> {
  const discounts = await getActiveDiscounts();
  return discounts.find((d) => d.discount_type === "bulk") ?? null;
}
