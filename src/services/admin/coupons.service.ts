import { apiClient } from "@/lib/api-client";
import type {
  Coupon,
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
