import { apiClient } from "@/lib/api-client";
import type {
  Discount,
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
