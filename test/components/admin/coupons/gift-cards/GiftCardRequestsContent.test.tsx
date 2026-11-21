import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import GiftCardRequestsContent from "@/components/admin/coupons/gift-cards/GiftCardRequestsContent";
import type { AdminGiftCardClaim, CouponGiftCardClaimsResponse } from "@/types/admin/coupons";
import { all_claims, makeRewardCoupon, ready_claim, sent_claim } from "./fixtures";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock("@/services/admin/gift-card-claims.service", () => ({
  getAdminCouponGiftCardClaims: jest.fn(),
  updateAdminGiftCardClaimFulfillment: jest.fn(),
}));

jest.mock("@/components/admin/coupons/gift-cards/gift-card-claims", () => {
  const actual = jest.requireActual("@/components/admin/coupons/gift-cards/gift-card-claims");
  return { ...actual, exportGiftCardClaims: jest.fn().mockResolvedValue(undefined) };
});

import {
  getAdminCouponGiftCardClaims,
  updateAdminGiftCardClaimFulfillment,
} from "@/services/admin/gift-card-claims.service";
import { exportGiftCardClaims } from "@/components/admin/coupons/gift-cards/gift-card-claims";

const mockGet = getAdminCouponGiftCardClaims as jest.MockedFunction<typeof getAdminCouponGiftCardClaims>;
const mockUpdate = updateAdminGiftCardClaimFulfillment as jest.MockedFunction<typeof updateAdminGiftCardClaimFulfillment>;
const mockExport = exportGiftCardClaims as jest.MockedFunction<typeof exportGiftCardClaims>;

function makeResponse(claims: AdminGiftCardClaim[] = all_claims): CouponGiftCardClaimsResponse {
  return {
    coupon: makeRewardCoupon(),
    summary: {
      total_count: claims.length,
      client_count: claims.length,
      reward_total: 0,
      order_total: 0,
      by_status: {
        pending_details: { count: 0, reward_total: 0 },
        submitted: { count: 0, reward_total: 0 },
        fulfilled: { count: 0, reward_total: 0 },
      },
      by_brand: [],
      first_created_at: null,
      last_created_at: null,
    },
    data: claims,
  };
}

async function renderView(props: Partial<React.ComponentProps<typeof GiftCardRequestsContent>> = {}) {
  render(<GiftCardRequestsContent coupon_id="coupon-1" {...props} />);
  await screen.findByRole("heading", { name: "Happy Holidays 10% Back" });
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  mockGet.mockResolvedValue(makeResponse());
});

describe("GiftCardRequestsContent", () => {
  it("loads the coupon requests and shows the totals", async () => {
    await renderView();

    expect(mockGet).toHaveBeenCalledWith("coupon-1");
    expect(screen.getByText("HAPPYHOLIDAYS", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("$160.00")).toBeInTheDocument();
    expect(screen.getByText(/Showing 3 of 3/)).toBeInTheDocument();
    expect(screen.getByText("Jane Client")).toBeInTheDocument();
    expect(screen.getByText("Bob Waiting")).toBeInTheDocument();
    expect(screen.getByText("Carla Sent")).toBeInTheDocument();
  });

  it("links back to the coupon edit page", async () => {
    await renderView();

    expect(screen.getByRole("link", { name: "Edit coupon" })).toHaveAttribute("href", "/admin/coupons/coupon-1/edit");
  });

  it("filters by status from the KPI cards and clears the filter from the toolbar", async () => {
    await renderView();

    fireEvent.click(screen.getByRole("button", { name: /Waiting for client.*\$30\.00/ }));

    expect(screen.getByText(/Showing 1 of 3/)).toBeInTheDocument();
    expect(screen.getByText("Bob Waiting")).toBeInTheDocument();
    expect(screen.queryByText("Jane Client")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove the Waiting for client filter" }));

    expect(screen.getByText(/Showing 3 of 3/)).toBeInTheDocument();
  });

  it("starts filtered when a status comes from the URL", async () => {
    await renderView({ initial_status: "submitted" });

    expect(screen.getByText(/Showing 1 of 3/)).toBeInTheDocument();
    expect(screen.queryByText("Bob Waiting")).not.toBeInTheDocument();
  });

  it("filters with the search box", async () => {
    await renderView();

    fireEvent.change(screen.getByLabelText("Search gift card requests"), { target: { value: "globex" } });

    expect(screen.getByText(/Showing 1 of 3/)).toBeInTheDocument();
    expect(screen.getByText("Carla Sent")).toBeInTheDocument();
    expect(screen.queryByText("Jane Client")).not.toBeInTheDocument();
  });

  it("marks a request as sent from the status picker", async () => {
    mockUpdate.mockResolvedValue({ ...ready_claim, status: "fulfilled", fulfilled_at: "2026-11-22T10:00:00+00:00" });
    await renderView();

    const status_cell = screen.getByRole("button", { name: "Ready to send" });
    fireEvent.click(status_cell);
    const picker = screen.getByRole("menu", { name: "Set status" });
    fireEvent.click(within(picker).getByRole("menuitemradio", { name: /Sent/ }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("claim-1", true));
    // The Sent KPI card now counts both sent requests.
    expect(await screen.findByRole("button", { name: /2\s*Sent\s*\$130\.00/ })).toBeInTheDocument();
  });

  it("opens the status menu on the current status and supports the keyboard", async () => {
    await renderView();

    const status_cell = screen.getByRole("button", { name: "Ready to send" });
    fireEvent.click(status_cell);
    const menu = screen.getByRole("menu", { name: "Set status" });

    expect(within(menu).getByText("Changes are saved instantly.")).toBeInTheDocument();
    const current = within(menu).getByRole("menuitemradio", { checked: true });
    expect(current).toHaveTextContent("Ready to send");
    expect(current).toHaveFocus();

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(within(menu).getByRole("menuitemradio", { name: /Sent/ })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(status_cell).toHaveFocus();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("opens the status menu as a bottom sheet on phones", async () => {
    const original_match_media = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes("max-width"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    try {
      mockUpdate.mockResolvedValue({ ...ready_claim, status: "fulfilled" });
      await renderView();

      fireEvent.click(screen.getByRole("button", { name: "Ready to send" }));
      const sheet = screen.getByRole("menu", { name: "Gift card status" });

      expect(within(sheet).getByText("Jane Client, $80.00 Amazon")).toBeInTheDocument();
      expect(within(sheet).getByText("The client already got the gift card")).toBeInTheDocument();
      expect(document.body.style.overflow).toBe("hidden");

      fireEvent.click(within(sheet).getByRole("menuitemradio", { name: /Sent/ }));

      await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("claim-1", true));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe("");
    } finally {
      window.matchMedia = original_match_media;
    }
  });

  it("does not open the picker while the client has not submitted details", async () => {
    await renderView();

    expect(screen.getByRole("button", { name: "Waiting for client" })).toBeDisabled();
  });

  it("marks the selected requests as sent in bulk", async () => {
    mockUpdate.mockResolvedValue({ ...ready_claim, status: "fulfilled" });
    await renderView();

    fireEvent.click(screen.getByLabelText("Select the request of Jane Client"));
    fireEvent.click(screen.getByLabelText("Select the request of Carla Sent"));

    const bulk_bar = screen.getByRole("region", { name: "Bulk actions" });
    expect(within(bulk_bar).getByText("2")).toBeInTheDocument();

    fireEvent.click(within(bulk_bar).getByRole("button", { name: "Mark as sent (1)" }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith("claim-1", true);
    await waitFor(() => expect(screen.queryByRole("region", { name: "Bulk actions" })).not.toBeInTheDocument());
  });

  it("shows an error when a status update fails", async () => {
    mockUpdate.mockRejectedValue(new Error("Server error"));
    await renderView();

    fireEvent.click(screen.getByRole("button", { name: "Ready to send" }));
    fireEvent.click(within(screen.getByRole("menu", { name: "Set status" })).getByRole("menuitemradio", { name: /Sent/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("We could not update the gift card status.");
  });

  it("exports every request to Excel", async () => {
    await renderView();

    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    const dialog = screen.getByRole("dialog", { name: "Export gift card requests" });
    fireEvent.click(within(dialog).getByRole("button", { name: /Excel/ }));

    await waitFor(() => expect(mockExport).toHaveBeenCalledTimes(1));
    const [claims, coupon_code, format] = mockExport.mock.calls[0];
    expect(claims).toHaveLength(3);
    expect(coupon_code).toBe("HAPPYHOLIDAYS");
    expect(format).toBe("xlsx");
  });

  it("exports only the selected rows to CSV", async () => {
    await renderView();

    fireEvent.click(screen.getByLabelText("Select the request of Carla Sent"));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    const dialog = screen.getByRole("dialog", { name: "Export gift card requests" });
    fireEvent.click(within(dialog).getByRole("radio", { name: /Selected rows/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: /CSV/ }));

    await waitFor(() => expect(mockExport).toHaveBeenCalledTimes(1));
    const [claims, , format, file_suffix] = mockExport.mock.calls[0];
    expect(claims.map((claim) => claim.id)).toEqual([sent_claim.id]);
    expect(format).toBe("csv");
    expect(file_suffix).toBe("selected");
  });

  it("shows an empty state when nobody used the coupon", async () => {
    mockGet.mockResolvedValue(makeResponse([]));
    await renderView();

    expect(screen.getByText("No gift card requests yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
  });

  it("shows an error state when the coupon cannot be loaded", async () => {
    mockGet.mockRejectedValue(new Error("This coupon does not reward gift cards."));
    render(<GiftCardRequestsContent coupon_id="coupon-1" />);

    expect(await screen.findByText("Gift card requests unavailable")).toBeInTheDocument();
    expect(screen.getByText("This coupon does not reward gift cards.")).toBeInTheDocument();
  });
});
