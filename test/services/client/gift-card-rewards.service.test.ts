jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
import { giftCardRewardsService } from "@/services/client/gift-card-rewards.service";

const mocked = apiClient as jest.Mocked<typeof apiClient>;

describe("giftCardRewardsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("looks a reward up by checkout session", async () => {
    mocked.get.mockResolvedValueOnce({ data: { id: "claim-1" } });

    const reward = await giftCardRewardsService.lookup({ session_id: "session-1" });

    expect(mocked.get).toHaveBeenCalledWith("/api/gift-card-rewards/lookup?session_id=session-1");
    expect(reward).toEqual({ id: "claim-1" });
  });

  it("looks a reward up by order", async () => {
    mocked.get.mockResolvedValueOnce({ data: null });

    const reward = await giftCardRewardsService.lookup({ order_id: "order-1" });

    expect(mocked.get).toHaveBeenCalledWith("/api/gift-card-rewards/lookup?order_id=order-1");
    expect(reward).toBeNull();
  });

  it("submits the brand and email for a reward", async () => {
    mocked.put.mockResolvedValueOnce({ data: { id: "claim-1", status: "submitted" } });

    const reward = await giftCardRewardsService.submit("claim-1", {
      recipient_email: "me@example.com",
      gift_card_brand: "amazon",
    });

    expect(mocked.put).toHaveBeenCalledWith("/api/gift-card-rewards/claim-1", {
      recipient_email: "me@example.com",
      gift_card_brand: "amazon",
    });
    expect(reward).toEqual({ id: "claim-1", status: "submitted" });
  });

  it("lets API errors reach the caller", async () => {
    mocked.put.mockRejectedValueOnce(new Error("This promotion has ended"));

    await expect(
      giftCardRewardsService.submit("claim-1", { recipient_email: "me@example.com", gift_card_brand: "visa" })
    ).rejects.toThrow("This promotion has ended");
  });
});
