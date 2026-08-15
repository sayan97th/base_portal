import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { CartProvider } from "@/context/CartContext";
import LinkBuildingPage from "@/components/link-building/LinkBuildingPage";
import { linkBuildingService } from "@/services/client/link-building.service";
import { profileService } from "@/services/client/profile.service";
import { unifiedCartService } from "@/services/client/unified-cart.service";
import { getActiveDiscounts } from "@/services/client/discounts.service";
import type { UnifiedCartPayload } from "@/types/client/unified-cart";

// ─── Module mocks ────────────────────────────────────────────────────────────
// This is the exact regression scenario the client reported: the DR 60+ tier
// was repriced from $500 to $475 on the admin side, but the client's saved
// cart still held a $500 snapshot from before the change. Order Summary must
// show the current $475 price, not the stale one.

jest.mock("@/services/client/link-building.service", () => ({
  linkBuildingService: {
    fetchDrTiers: jest.fn(),
    fetchContentRefreshTiers: jest.fn(),
  },
}));

jest.mock("@/services/client/profile.service", () => ({
  profileService: {
    fetchUserProfile: jest.fn(),
  },
}));

jest.mock("@/services/client/unified-cart.service", () => ({
  unifiedCartService: {
    fetchCart: jest.fn(),
    saveCart: jest.fn(() => Promise.resolve()),
    deleteCart: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock("@/services/client/discounts.service", () => ({
  getActiveDiscounts: jest.fn(),
}));

// Unrelated to the price-sync behavior under test — stubbed so the page can
// mount without a Next.js router or a real NotificationsProvider.
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/context/NotificationsContext", () => ({
  useNotifications: () => ({ addNotification: jest.fn() }),
}));

const mockFetchDrTiers = linkBuildingService.fetchDrTiers as jest.MockedFunction<
  typeof linkBuildingService.fetchDrTiers
>;
const mockFetchContentRefreshTiers =
  linkBuildingService.fetchContentRefreshTiers as jest.MockedFunction<
    typeof linkBuildingService.fetchContentRefreshTiers
  >;
const mockFetchUserProfile = profileService.fetchUserProfile as jest.MockedFunction<
  typeof profileService.fetchUserProfile
>;
const mockFetchCart = unifiedCartService.fetchCart as jest.MockedFunction<
  typeof unifiedCartService.fetchCart
>;
const mockGetActiveDiscounts = getActiveDiscounts as jest.MockedFunction<
  typeof getActiveDiscounts
>;

function renderPage() {
  return render(
    <CartProvider>
      <LinkBuildingPage />
    </CartProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockFetchContentRefreshTiers.mockResolvedValue([]);
  mockFetchUserProfile.mockRejectedValue(new Error("no profile in test"));
  mockGetActiveDiscounts.mockResolvedValue([]);
});

describe("LinkBuildingPage price sync", () => {
  it("corrects a stale cart price to the tier's current admin-configured price", async () => {
    // Admin has since repriced DR 60+ to $475/link.
    mockFetchDrTiers.mockResolvedValue([
      {
        id: "dr60",
        label: "DR 60+",
        traffic_range: "5,000-50,000+",
        word_count: 700,
        price_per_link: 475,
        is_most_popular: false,
        is_active: true,
      },
    ]);

    // The client's saved cart still holds the old $500 snapshot for 2 links.
    const stale_cart: UnifiedCartPayload = {
      items: [
        {
          cart_item_id: "stale-item",
          product_type: "link_building",
          tier_id: "dr60",
          tier_name: "DR 60+",
          quantity: 2,
          unit_price: 500,
        },
      ],
      applied_coupons: [],
      coupon_input_code: "",
      order_title: "",
      order_notes: "",
    };
    mockFetchCart.mockResolvedValue(stale_cart);

    renderPage();

    // Order Summary must settle on the corrected total (2 * $475 = $950),
    // never the stale one (2 * $500 = $1,000).
    await waitFor(() => {
      expect(screen.getAllByText("$950.00").length).toBeGreaterThan(0);
    });

    expect(screen.queryByText("$1,000.00")).not.toBeInTheDocument();
  });

  it("keeps the correct price when the cart was already up to date", async () => {
    mockFetchDrTiers.mockResolvedValue([
      {
        id: "dr60",
        label: "DR 60+",
        traffic_range: "5,000-50,000+",
        word_count: 700,
        price_per_link: 475,
        is_most_popular: false,
        is_active: true,
      },
    ]);

    const up_to_date_cart: UnifiedCartPayload = {
      items: [
        {
          cart_item_id: "fresh-item",
          product_type: "link_building",
          tier_id: "dr60",
          tier_name: "DR 60+",
          quantity: 1,
          unit_price: 475,
        },
      ],
      applied_coupons: [],
      coupon_input_code: "",
      order_title: "",
      order_notes: "",
    };
    mockFetchCart.mockResolvedValue(up_to_date_cart);

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("$475.00").length).toBeGreaterThan(0);
    });
  });
});
