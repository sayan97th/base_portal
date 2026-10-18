jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
import { paymentProfileService } from "@/services/client/payment-profile.service";
import type { CreatePaymentProfilePayload } from "@/types/client/payment-profile";

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>;
const mockDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("paymentProfileService", () => {
  it("fetchPaymentProfiles calls GET /api/payment-profiles and unwraps data", async () => {
    mockGet.mockResolvedValueOnce({ data: [{ id: "p1" }] });

    const result = await paymentProfileService.fetchPaymentProfiles();

    expect(mockGet).toHaveBeenCalledWith("/api/payment-profiles");
    expect(result).toEqual([{ id: "p1" }]);
  });

  it("createPaymentProfile posts the billing_address alongside the payment method", async () => {
    mockPost.mockResolvedValueOnce({ data: { id: "p1" } });

    const payload: CreatePaymentProfilePayload = {
      stripe_payment_method_id: "pm_new_card",
      cardholder_name: "Jane Doe",
      is_default: true,
      billing_address: {
        address_line1: "123 Main St",
        city: "Boise",
        state: "ID",
        postal_code: "83701",
        country: "US",
        company: "Acme Inc",
      },
    };

    await paymentProfileService.createPaymentProfile(payload);

    expect(mockPost).toHaveBeenCalledWith("/api/payment-profiles", payload);
  });

  it("createPaymentProfile still works when billing_address is omitted", async () => {
    mockPost.mockResolvedValueOnce({ data: { id: "p1" } });

    const payload: CreatePaymentProfilePayload = {
      stripe_payment_method_id: "pm_new_card",
      cardholder_name: null,
      is_default: false,
    };

    await paymentProfileService.createPaymentProfile(payload);

    expect(mockPost).toHaveBeenCalledWith("/api/payment-profiles", payload);
  });

  it("deletePaymentProfile calls DELETE with the profile id", async () => {
    mockDelete.mockResolvedValueOnce(undefined);

    await paymentProfileService.deletePaymentProfile("profile-1");

    expect(mockDelete).toHaveBeenCalledWith("/api/payment-profiles/profile-1");
  });

  it("setDefaultPaymentProfile calls PATCH with is_default true", async () => {
    mockPatch.mockResolvedValueOnce({ data: { id: "profile-1", is_default: true } });

    const result = await paymentProfileService.setDefaultPaymentProfile("profile-1");

    expect(mockPatch).toHaveBeenCalledWith("/api/payment-profiles/profile-1/default", {
      is_default: true,
    });
    expect(result.is_default).toBe(true);
  });
});
