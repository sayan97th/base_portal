/**
 * Order page and receipt gift card panel (GiftCardRewardPanel) for a
 * HAPPYHOLIDAYS order that hit the $1,000 limit: the client sees why the gift
 * card is $1,000 and not 10% of the order total.
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import GiftCardRewardPanel from "@/components/gift-card-rewards/GiftCardRewardPanel";
import { giftCardRewardsService } from "@/services/client/gift-card-rewards.service";
import type { GiftCardReward } from "@/types/client/gift-card-rewards";

jest.mock("@/services/client/gift-card-rewards.service", () => ({
  giftCardRewardsService: {
    lookup: jest.fn(),
    submit: jest.fn(),
  },
}));

const mockLookup = giftCardRewardsService.lookup as jest.MockedFunction<typeof giftCardRewardsService.lookup>;

/** A $50,000 order: 10% would be $5,000, the promo sends $1,000. */
function makeCappedReward(overrides: Partial<GiftCardReward> = {}): GiftCardReward {
  return {
    id: "claim-1",
    session_id: "session-1",
    order_ids: ["order-1"],
    coupon_code: "HAPPYHOLIDAYS",
    promotion_name: "Happy Holidays 10% Back",
    order_total: 50000,
    reward_percentage: 10,
    max_reward_amount: 1000,
    is_reward_capped: true,
    reward_amount: 1000,
    recipient_email: null,
    gift_card_brand: null,
    status: "pending_details",
    is_claimable: true,
    promotion_ends_at: "2027-01-01T00:00:00+00:00",
    submitted_at: null,
    fulfilled_at: null,
    brands: [
      { value: "amazon", label: "Amazon" },
      { value: "visa", label: "Visa" },
      { value: "target", label: "Target" },
    ],
    ...overrides,
  };
}

describe("GiftCardRewardPanel with a capped gift card", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("explains the $1,000 maximum on the order page", async () => {
    mockLookup.mockResolvedValue(makeCappedReward());
    render(<GiftCardRewardPanel order_id="order-1" />);

    expect(await screen.findByText(/you earned a \$1,000\.00 gift card for this order/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This promo gives up to \$1,000 per order, the maximum gift card value\./)
    ).toBeInTheDocument();
  });

  it("repeats the maximum in the claim form", async () => {
    mockLookup.mockResolvedValue(makeCappedReward());
    render(<GiftCardRewardPanel order_id="order-1" />);

    fireEvent.click(await screen.findByRole("button", { name: /choose my gift card/i }));

    expect(screen.getByText(/10% back on your \$50,000\.00 order\s*, up to \$1,000/)).toBeInTheDocument();
  });

  it("does not mention a maximum when the gift card stayed below it", async () => {
    mockLookup.mockResolvedValue(
      makeCappedReward({ order_total: 800, reward_amount: 80, is_reward_capped: false })
    );
    render(<GiftCardRewardPanel order_id="order-1" />);

    expect(await screen.findByText(/you earned a \$80\.00 gift card/i)).toBeInTheDocument();
    expect(screen.queryByText(/maximum gift card value/)).not.toBeInTheDocument();
  });

  it("does not mention a maximum for gift cards earned before the limit existed", async () => {
    mockLookup.mockResolvedValue(
      makeCappedReward({ reward_amount: 5000, max_reward_amount: undefined, is_reward_capped: undefined })
    );
    render(<GiftCardRewardPanel order_id="order-1" />);

    expect(await screen.findByText(/you earned a \$5,000\.00 gift card/i)).toBeInTheDocument();
    expect(screen.queryByText(/maximum gift card value/)).not.toBeInTheDocument();
  });

  it("shows the capped value once the details were submitted", async () => {
    mockLookup.mockResolvedValue(
      makeCappedReward({ status: "submitted", is_claimable: false, recipient_email: "me@example.com", gift_card_brand: "visa" })
    );
    render(<GiftCardRewardPanel session_id="session-1" />);

    expect(await screen.findByText(/gift card request received/i)).toBeInTheDocument();
    expect(screen.getByText("$1,000.00 Visa")).toBeInTheDocument();
  });
});
