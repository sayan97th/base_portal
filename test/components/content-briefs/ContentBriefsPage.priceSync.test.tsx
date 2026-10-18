import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { CartProvider } from "@/context/CartContext";
import ContentBriefsPage from "@/components/content-briefs/ContentBriefsPage";
import { contentBriefsService } from "@/services/client/content-briefs.service";
import { profileService } from "@/services/client/profile.service";
import { unifiedCartService } from "@/services/client/unified-cart.service";
import { getActiveDiscounts } from "@/services/client/discounts.service";
import type { UnifiedCartPayload } from "@/types/client/unified-cart";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/client/content-briefs.service", () => ({
  contentBriefsService: {
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

const mockFetchTiers = contentBriefsService.fetchTiers as jest.MockedFunction<
  typeof contentBriefsService.fetchTiers
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
      <ContentBriefsPage />
    </CartProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  // Price sync reconciles against the server cart, which the CartContext only
  // fetches for authenticated users — seed a token so that guard doesn't skip it.
  localStorage.setItem("access_token", "a-jwt-token");
  mockFetchUserProfile.mockRejectedValue(new Error("no profile in test"));
  mockGetActiveDiscounts.mockResolvedValue([]);
});

describe("ContentBriefsPage price sync", () => {
  it("corrects a stale cart price to the tier's current admin-configured price", async () => {
    mockFetchTiers.mockResolvedValue([
      {
        id: "cb-standard",
        label: "Standard Brief",
        turnaround_days: 3,
        price: 80,
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
          product_type: "content_brief",
          tier_id: "cb-standard",
          tier_name: "Standard Brief",
          quantity: 4,
          unit_price: 60, // stale price from before an admin repricing
        },
      ],
      applied_coupons: [],
      coupon_input_code: "",
      order_title: "",
      order_notes: "",
    };
    mockFetchCart.mockResolvedValue(stale_cart);

    renderPage();

    // 4 * $80 = $320 (current price), not 4 * $60 = $240 (stale price).
    await waitFor(() => {
      expect(screen.getAllByText("$320.00").length).toBeGreaterThan(0);
    });

    expect(screen.queryByText("$240.00")).not.toBeInTheDocument();
  });
});
