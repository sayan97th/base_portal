import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CouponGiftCardClaimsBoard from "@/components/admin/coupons/CouponGiftCardClaimsBoard";
import type { AdminGiftCardClaim } from "@/types/admin/coupons";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock("@/services/admin/gift-card-claims.service", () => ({
  listAdminGiftCardClaims: jest.fn(),
  updateAdminGiftCardClaimFulfillment: jest.fn(),
}));

import {
  listAdminGiftCardClaims,
  updateAdminGiftCardClaimFulfillment,
} from "@/services/admin/gift-card-claims.service";

const mockList = listAdminGiftCardClaims as jest.MockedFunction<typeof listAdminGiftCardClaims>;
const mockUpdate = updateAdminGiftCardClaimFulfillment as jest.MockedFunction<typeof updateAdminGiftCardClaimFulfillment>;

function makeClaim(overrides: Partial<AdminGiftCardClaim> = {}): AdminGiftCardClaim {
  return {
    id: "claim-1",
    coupon_id: "coupon-1",
    session_id: "abcd1234-0000-0000-0000-000000000000",
    order_ids: ["order-1"],
    coupon_code: "HAPPYHOLIDAYS",
    promotion_name: "Happy Holidays 10% Back",
    order_total: 800,
    reward_percentage: 10,
    reward_amount: 80,
    recipient_email: "gifts@example.com",
    gift_card_brand: "amazon",
    gift_card_brand_label: "Amazon",
    submission_source: "checkout",
    status: "submitted",
    is_claimable: false,
    submitted_at: "2026-11-20T10:00:00+00:00",
    fulfilled_at: null,
    created_at: "2026-11-20T10:00:00+00:00",
    client: { id: 1, name: "Jane Client", email: "jane@example.com", company: "Acme" },
    fulfilled_by: null,
    ...overrides,
  };
}

const claims = [
  makeClaim(),
  makeClaim({
    id: "claim-2",
    status: "pending_details",
    recipient_email: null,
    gift_card_brand: null,
    gift_card_brand_label: null,
    client: { id: 2, name: "Bob Waiting", email: "bob@example.com", company: null },
  }),
  makeClaim({
    id: "claim-3",
    status: "fulfilled",
    gift_card_brand: "visa",
    gift_card_brand_label: "Visa",
    fulfilled_at: "2026-11-21T10:00:00+00:00",
    fulfilled_by: { id: 9, name: "Abby" },
    order_ids: ["order-3", "order-4"],
    client: { id: 3, name: "Cara Sent", email: "cara@example.com", company: null },
  }),
];

describe("CouponGiftCardClaimsBoard (admin order pages)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockResolvedValue([makeClaim()]);
  });

  it("shows the promo for an order that used it", async () => {
    render(<CouponGiftCardClaimsBoard order_id="order-1" />);

    expect(await screen.findByText(/used the HAPPYHOLIDAYS money back promo code/i)).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith({ order_id: "order-1", session_id: undefined });
    expect(screen.getByText("gifts@example.com")).toBeInTheDocument();
    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.getByText("$80.00")).toBeInTheDocument();
  });

  it("links to every request of the coupon", async () => {
    render(<CouponGiftCardClaimsBoard order_id="order-1" />);

    expect(await screen.findByRole("link", { name: "View all requests" })).toHaveAttribute(
      "href",
      "/admin/coupons/coupon-1/gift-cards"
    );
  });

  it("loads the requests of a whole checkout session", async () => {
    mockList.mockResolvedValue(claims);
    render(<CouponGiftCardClaimsBoard session_id="abcd1234-0000-0000-0000-000000000000" />);

    await screen.findAllByText(/money back promo code/i);
    expect(mockList).toHaveBeenCalledWith({ order_id: undefined, session_id: "abcd1234-0000-0000-0000-000000000000" });
    expect(screen.getByText("Not provided yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Waiting for client" })).toBeDisabled();
    expect(screen.getByText(/by Abby/)).toBeInTheDocument();
  });

  it("marks a gift card as sent when its status is clicked", async () => {
    mockUpdate.mockResolvedValue(
      makeClaim({ status: "fulfilled", fulfilled_at: "2026-11-22T10:00:00+00:00", fulfilled_by: { id: 9, name: "Abby" } })
    );
    render(<CouponGiftCardClaimsBoard order_id="order-1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Ready to send" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("claim-1", true));
    expect(await screen.findByRole("button", { name: "Sent" })).toBeInTheDocument();
  });

  it("can undo a gift card marked as sent", async () => {
    mockList.mockResolvedValue([claims[2]]);
    mockUpdate.mockResolvedValue({ ...claims[2], status: "submitted", fulfilled_at: null, fulfilled_by: null });
    render(<CouponGiftCardClaimsBoard order_id="order-3" />);

    fireEvent.click(await screen.findByRole("button", { name: "Sent" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("claim-3", false));
    expect(await screen.findByRole("button", { name: "Ready to send" })).toBeInTheDocument();
  });

  it("shows an error when the update fails", async () => {
    mockUpdate.mockRejectedValue(new Error("boom"));
    render(<CouponGiftCardClaimsBoard order_id="order-1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Ready to send" }));

    expect(await screen.findByText("Could not update the gift card request. Please try again.")).toBeInTheDocument();
  });

  it("hides itself when the order did not use the promo", async () => {
    mockList.mockResolvedValue([]);
    const { container } = render(<CouponGiftCardClaimsBoard order_id="order-1" />);

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("hides itself when the requests cannot be loaded", async () => {
    mockList.mockRejectedValue(new Error("boom"));
    const { container } = render(<CouponGiftCardClaimsBoard order_id="order-1" />);

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
