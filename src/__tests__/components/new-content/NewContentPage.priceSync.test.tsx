import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { CartProvider } from "@/context/CartContext";
import NewContentPage from "@/components/new-content/NewContentPage";
import { newContentService } from "@/services/client/new-content.service";
import { profileService } from "@/services/client/profile.service";
import { unifiedCartService } from "@/services/client/unified-cart.service";
import { getActiveDiscounts } from "@/services/client/discounts.service";
import type { UnifiedCartPayload } from "@/types/client/unified-cart";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/client/new-content.service", () => ({
  newContentService: {
    fetchNewContentTiers: jest.fn(),
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

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/context/NotificationsContext", () => ({
  useNotifications: () => ({ addNotification: jest.fn() }),
}));

const mockFetchNewContentTiers =
  newContentService.fetchNewContentTiers as jest.MockedFunction<
    typeof newContentService.fetchNewContentTiers
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
      <NewContentPage />
    </CartProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockFetchUserProfile.mockRejectedValue(new Error("no profile in test"));
  mockGetActiveDiscounts.mockResolvedValue([]);
});

describe("NewContentPage price sync", () => {
  it("corrects a stale cart price to the tier's current admin-configured price", async () => {
    mockFetchNewContentTiers.mockResolvedValue([
      {
        id: "nc-standard",
        label: "Standard Article",
        turnaround_time: "6 Days",
        price: 150,
        is_active: true,
        is_most_popular: false,
        max_quantity: null,
        is_hidden: false,
        sort_order: 1,
      },
    ]);

    const stale_cart: UnifiedCartPayload = {
      items: [
        {
          cart_item_id: "stale-item",
          product_type: "new_content",
          tier_id: "nc-standard",
          tier_name: "Standard Article",
          quantity: 3,
          unit_price: 100, // stale price from before an admin repricing
        },
      ],
      applied_coupons: [],
      coupon_input_code: "",
      order_title: "",
      order_notes: "",
    };
    mockFetchCart.mockResolvedValue(stale_cart);

    renderPage();

    // 3 * $150 = $450 (current price), not 3 * $100 = $300 (stale price).
    await waitFor(() => {
      expect(screen.getAllByText("$450.00").length).toBeGreaterThan(0);
    });

    expect(screen.queryByText("$300.00")).not.toBeInTheDocument();
  });
});
