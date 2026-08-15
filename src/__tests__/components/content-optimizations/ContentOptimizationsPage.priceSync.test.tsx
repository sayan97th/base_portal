import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { CartProvider } from "@/context/CartContext";
import ContentOptimizationsPage from "@/components/content-optimizations/ContentOptimizationsPage";
import { contentOptimizationService } from "@/services/client/content-optimization.service";
import { profileService } from "@/services/client/profile.service";
import { unifiedCartService } from "@/services/client/unified-cart.service";
import { getActiveDiscounts } from "@/services/client/discounts.service";
import type { UnifiedCartPayload } from "@/types/client/unified-cart";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/client/content-optimization.service", () => ({
  contentOptimizationService: {
    fetchTiers: jest.fn(),
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

const mockFetchTiers = contentOptimizationService.fetchTiers as jest.MockedFunction<
  typeof contentOptimizationService.fetchTiers
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
      <ContentOptimizationsPage />
    </CartProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockFetchUserProfile.mockRejectedValue(new Error("no profile in test"));
  mockGetActiveDiscounts.mockResolvedValue([]);
});

describe("ContentOptimizationsPage price sync", () => {
  it("corrects a stale cart price to the tier's current admin-configured price", async () => {
    mockFetchTiers.mockResolvedValue([
      {
        id: "co-basic",
        label: "Basic",
        word_count_range: "500-1000",
        turnaround_days: 5,
        price: 200,
        is_active: true,
        is_most_popular: false,
        max_quantity: null,
        is_hidden: false,
        sort_order: 1,
        created_at: "",
        updated_at: "",
      },
    ]);

    const stale_cart: UnifiedCartPayload = {
      items: [
        {
          cart_item_id: "stale-item",
          product_type: "content_optimization",
          tier_id: "co-basic",
          tier_name: "Basic",
          quantity: 2,
          unit_price: 150, // stale price from before an admin repricing
        },
      ],
      applied_coupons: [],
      coupon_input_code: "",
      order_title: "",
      order_notes: "",
    };
    mockFetchCart.mockResolvedValue(stale_cart);

    renderPage();

    // 2 * $200 = $400 (current price), not 2 * $150 = $300 (stale price).
    await waitFor(() => {
      expect(screen.getAllByText("$400.00").length).toBeGreaterThan(0);
    });

    expect(screen.queryByText("$300.00")).not.toBeInTheDocument();
  });
});
