import { apiClient } from "@/lib/api-client";
import type {
  ValidateCouponPayload,
  ValidateCouponResponse,
} from "@/types/client/link-building";

export async function validateCoupon(
  payload: ValidateCouponPayload
): Promise<ValidateCouponResponse> {
  return apiClient.post<ValidateCouponResponse>("/api/coupons/validate", payload);
}
