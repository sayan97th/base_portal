import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GiftCardRewardForm from "@/components/gift-card-rewards/GiftCardRewardForm";
import GiftCardRewardPanel from "@/components/gift-card-rewards/GiftCardRewardPanel";
import { giftCardRewardsService } from "@/services/client/gift-card-rewards.service";
import {
  ORDER_GIFT_CARD_NOTE,
  describeOrderGiftCardCoverage,
  formatRewardPercentage,
  isGiftCardRewardCoupon,
  isGiftCardRewardDetailsComplete,
  type GiftCardReward,
} from "@/types/client/gift-card-rewards";

jest.mock("@/services/client/gift-card-rewards.service", () => ({
  giftCardRewardsService: {
    lookup: jest.fn(),
    submit: jest.fn(),
  },
}));

const mockLookup = giftCardRewardsService.lookup as jest.MockedFunction<typeof giftCardRewardsService.lookup>;
const mockSubmit = giftCardRewardsService.submit as jest.MockedFunction<typeof giftCardRewardsService.submit>;

function makeReward(overrides: Partial<GiftCardReward> = {}): GiftCardReward {
  return {
    id: "claim-1",
    session_id: "session-1",
    order_ids: ["order-1"],
    coupon_code: "HAPPYHOLIDAYS",
    promotion_name: "Happy Holidays 10% Back",
    order_total: 800,
    reward_percentage: 10,
    reward_amount: 80,
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

describe("gift card reward helpers", () => {
  it("detects money back coupons by flag or discount type", () => {
    expect(isGiftCardRewardCoupon({ discount_type: "gift_card_reward" })).toBe(true);
    expect(isGiftCardRewardCoupon({ discount_type: "percentage", is_gift_card_reward: true })).toBe(true);
    expect(isGiftCardRewardCoupon({ discount_type: "percentage" })).toBe(false);
  });

  it("only treats details as complete with a valid email and a known brand", () => {
    expect(isGiftCardRewardDetailsComplete({ recipient_email: "me@example.com", gift_card_brand: "visa" })).toBe(true);
    expect(isGiftCardRewardDetailsComplete({ recipient_email: "not-an-email", gift_card_brand: "visa" })).toBe(false);
    expect(isGiftCardRewardDetailsComplete({ recipient_email: "me@example.com", gift_card_brand: "" })).toBe(false);
  });

  it("formats reward percentages without trailing zeros", () => {
    expect(formatRewardPercentage(10)).toBe("10%");
    expect(formatRewardPercentage(12.5)).toBe("12.5%");
  });

  it("describes the order coverage as one single gift card", () => {
    expect(describeOrderGiftCardCoverage(0)).toBe("One gift card for this order.");
    expect(describeOrderGiftCardCoverage(1)).toBe("One gift card for this order.");
    expect(describeOrderGiftCardCoverage(3)).toBe("One gift card for this whole order, covering all 3 items.");
    expect(describeOrderGiftCardCoverage(2, "product")).toBe(
      "One gift card for this whole order, covering all 2 products."
    );
  });

  it("keeps the shared per order note free of em dashes", () => {
    expect(ORDER_GIFT_CARD_NOTE).toBe("One gift card per order, never one per product or item.");
    expect(ORDER_GIFT_CARD_NOTE).not.toContain("—");
  });
});

describe("GiftCardRewardForm", () => {
  it("lets the client pick a brand and type an email", () => {
    const onChange = jest.fn();
    render(<GiftCardRewardForm value={{ recipient_email: "", gift_card_brand: "" }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("radio", { name: /target/i }));
    expect(onChange).toHaveBeenCalledWith({ recipient_email: "", gift_card_brand: "target" });

    fireEvent.change(screen.getByLabelText(/where should we send it/i), { target: { value: "me@example.com" } });
    expect(onChange).toHaveBeenCalledWith({ recipient_email: "me@example.com", gift_card_brand: "" });
  });
});

describe("GiftCardRewardForm extras", () => {
  it("offers the account email as a one click shortcut", () => {
    const onChange = jest.fn();
    render(
      <GiftCardRewardForm
        value={{ recipient_email: "", gift_card_brand: "visa" }}
        onChange={onChange}
        suggested_email="owner@company.com"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /use my account email/i }));
    expect(onChange).toHaveBeenCalledWith({ recipient_email: "owner@company.com", gift_card_brand: "visa" });
  });

  it("hides the shortcut when the email is already filled in with it", () => {
    render(
      <GiftCardRewardForm
        value={{ recipient_email: "owner@company.com", gift_card_brand: "" }}
        onChange={jest.fn()}
        suggested_email="owner@company.com"
      />
    );

    expect(screen.queryByRole("button", { name: /use my account email/i })).not.toBeInTheDocument();
  });
});

describe("GiftCardRewardPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when the order did not use a money back promo", async () => {
    mockLookup.mockResolvedValue(null);
    const { container } = render(<GiftCardRewardPanel order_id="order-1" />);

    await waitFor(() => expect(mockLookup).toHaveBeenCalledWith({ session_id: undefined, order_id: "order-1" }));
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the last day of the promo, including that whole day", async () => {
    mockLookup.mockResolvedValue(
      makeReward({ promotion_ends_at: "2026-12-19T06:59:59+00:00", promotion_last_day: "2026-12-18" })
    );

    render(<GiftCardRewardPanel order_id="order-1" />);

    expect(await screen.findByText(/available until december 18, 2026/i)).toBeInTheDocument();
  });

  it("works out the last day from the end moment when no last day is sent", async () => {
    mockLookup.mockResolvedValue(makeReward({ promotion_ends_at: "2027-01-01T00:00:00+00:00" }));

    render(<GiftCardRewardPanel order_id="order-1" />);

    expect(await screen.findByText(/available until december 31, 2026/i)).toBeInTheDocument();
  });

  it("lets the client submit missing details from the order page", async () => {
    mockLookup.mockResolvedValue(makeReward());
    mockSubmit.mockResolvedValue(
      makeReward({ status: "submitted", is_claimable: false, recipient_email: "me@example.com", gift_card_brand: "amazon" })
    );

    render(<GiftCardRewardPanel order_id="order-1" />);

    fireEvent.click(await screen.findByRole("button", { name: /choose my gift card/i }));
    fireEvent.click(screen.getByRole("radio", { name: /amazon/i }));
    fireEvent.change(screen.getByLabelText(/where should we send it/i), { target: { value: "me@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send my gift card details/i }));

    await waitFor(() =>
      expect(mockSubmit).toHaveBeenCalledWith("claim-1", { recipient_email: "me@example.com", gift_card_brand: "amazon" })
    );
    expect(await screen.findByText(/you are all set/i)).toBeInTheDocument();
  });

  it("validates the form before calling the API", async () => {
    mockLookup.mockResolvedValue(makeReward());
    render(<GiftCardRewardPanel order_id="order-1" />);

    fireEvent.click(await screen.findByRole("button", { name: /choose my gift card/i }));
    fireEvent.click(screen.getByRole("button", { name: /send my gift card details/i }));

    expect(await screen.findByText(/please choose a gift card/i)).toBeInTheDocument();
    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("shows a confirmation instead of the form once details were submitted", async () => {
    mockLookup.mockResolvedValue(
      makeReward({ status: "submitted", is_claimable: false, recipient_email: "me@example.com", gift_card_brand: "visa" })
    );
    render(<GiftCardRewardPanel session_id="session-1" />);

    expect(await screen.findByText(/gift card request received/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /choose my gift card/i })).not.toBeInTheDocument();
  });
});
