import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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

function rowFor(name: string) {
  return screen.getByText(name).closest("tr") as HTMLElement;
}

describe("CouponGiftCardClaimsBoard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockList.mockResolvedValue(claims);
  });

  it("loads the requests for the coupon and shows what each client chose", async () => {
    render(<CouponGiftCardClaimsBoard coupon_id="coupon-1" />);

    expect(await screen.findByText("Jane Client")).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith({ coupon_id: "coupon-1", order_id: undefined, session_id: undefined });

    const jane = rowFor("Jane Client");
    expect(within(jane).getByText("Amazon")).toBeInTheDocument();
    expect(within(jane).getByText("$80.00")).toBeInTheDocument();
    expect(within(jane).getByText("gifts@example.com")).toBeInTheDocument();
    expect(within(jane).getByRole("button", { name: "Ready to send" })).toBeEnabled();

    const bob = rowFor("Bob Waiting");
    expect(within(bob).getByText("Not chosen")).toBeInTheDocument();
    expect(within(bob).getByText("Not provided yet")).toBeInTheDocument();
    expect(within(bob).getByRole("button", { name: "Waiting for client" })).toBeDisabled();

    const cara = rowFor("Cara Sent");
    expect(within(cara).getByText(/by Abby/)).toBeInTheDocument();
    expect(within(cara).getByRole("link")).toHaveAttribute(
      "href",
      "/admin/orders/session/abcd1234-0000-0000-0000-000000000000"
    );
  });

  it("filters by status with counts on each tab", async () => {
    render(<CouponGiftCardClaimsBoard coupon_id="coupon-1" />);
    await screen.findByText("Jane Client");

    expect(screen.getByRole("tab", { name: /all/i })).toHaveTextContent("3");

    fireEvent.click(screen.getByRole("tab", { name: /ready to send/i }));

    expect(screen.getByText("Jane Client")).toBeInTheDocument();
    expect(screen.queryByText("Bob Waiting")).not.toBeInTheDocument();
    expect(screen.queryByText("Cara Sent")).not.toBeInTheDocument();
  });

  it("marks a gift card as sent when its status is clicked", async () => {
    mockUpdate.mockResolvedValue(makeClaim({ status: "fulfilled", fulfilled_at: "2026-11-22T10:00:00+00:00", fulfilled_by: { id: 9, name: "Abby" } }));
    render(<CouponGiftCardClaimsBoard coupon_id="coupon-1" />);
    await screen.findByText("Jane Client");

    fireEvent.click(within(rowFor("Jane Client")).getByRole("button", { name: "Ready to send" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("claim-1", true));
    expect(await within(rowFor("Jane Client")).findByRole("button", { name: "Sent" })).toBeInTheDocument();
  });

  it("can undo a gift card marked as sent", async () => {
    mockUpdate.mockResolvedValue(makeClaim({ id: "claim-3", status: "submitted", client: claims[2].client }));
    render(<CouponGiftCardClaimsBoard coupon_id="coupon-1" />);
    await screen.findByText("Cara Sent");

    fireEvent.click(within(rowFor("Cara Sent")).getByRole("button", { name: "Sent" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("claim-3", false));
  });

  it("shows an error when the update fails", async () => {
    mockUpdate.mockRejectedValue(new Error("boom"));
    render(<CouponGiftCardClaimsBoard coupon_id="coupon-1" />);
    await screen.findByText("Jane Client");

    fireEvent.click(within(rowFor("Jane Client")).getByRole("button", { name: "Ready to send" }));

    expect(await screen.findByText("Could not update the gift card request. Please try again.")).toBeInTheDocument();
  });

  it("explains when nobody used the promo yet", async () => {
    mockList.mockResolvedValue([]);
    render(<CouponGiftCardClaimsBoard coupon_id="coupon-1" />);

    expect(await screen.findByText("No client has used this promo code yet.")).toBeInTheDocument();
  });

  it("shows an error when the list cannot be loaded", async () => {
    mockList.mockRejectedValue(new Error("boom"));
    render(<CouponGiftCardClaimsBoard coupon_id="coupon-1" />);

    expect(await screen.findByText("Could not load gift card requests.")).toBeInTheDocument();
  });

  describe("compact card on admin order pages", () => {
    it("shows the promo for an order that used it", async () => {
      mockList.mockResolvedValue([makeClaim()]);
      render(<CouponGiftCardClaimsBoard order_id="order-1" compact />);

      expect(await screen.findByText(/used the HAPPYHOLIDAYS money back promo code/i)).toBeInTheDocument();
      expect(mockList).toHaveBeenCalledWith({ coupon_id: undefined, order_id: "order-1", session_id: undefined });
      expect(screen.getByText("gifts@example.com")).toBeInTheDocument();
    });

    it("hides itself when the order did not use the promo", async () => {
      mockList.mockResolvedValue([]);
      const { container } = render(<CouponGiftCardClaimsBoard order_id="order-1" compact />);

      await waitFor(() => expect(mockList).toHaveBeenCalled());
      expect(container).toBeEmptyDOMElement();
    });
  });
});
