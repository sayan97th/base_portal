/**
 * "Promo Codes" column of the admin discounts list (AdminDiscountsContent).
 * Admins can see at a glance which discounts can be combined with promo codes.
 */

import { render, screen, within } from "@testing-library/react";
import AdminDiscountsContent from "@/components/admin/discounts/AdminDiscountsContent";
import { makeBulkDiscount } from "../../../utils/promo-code-stacking-fixtures";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/services/admin/discounts.service", () => ({
  listAdminDiscounts: jest.fn(),
  toggleAdminDiscountStatus: jest.fn(),
  deleteAdminDiscount: jest.fn(),
}));

import { listAdminDiscounts } from "@/services/admin/discounts.service";

const mock_list = listAdminDiscounts as jest.MockedFunction<typeof listAdminDiscounts>;

async function rowFor(discount_name: string): Promise<HTMLElement> {
  return (await screen.findByText(discount_name)).closest("tr") as HTMLElement;
}

describe("AdminDiscountsContent promo code stacking column", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mock_list.mockResolvedValue([
      makeBulkDiscount({ id: "d1", name: "Default bulk" }),
      makeBulkDiscount({ id: "d2", name: "Holiday bulk", allow_promo_code_stacking: true }),
    ]);
  });

  it("adds a Promo Codes column to the table", async () => {
    render(<AdminDiscountsContent />);

    expect(await screen.findByRole("columnheader", { name: "Promo Codes" })).toBeInTheDocument();
  });

  it("marks discounts that keep the default as not combined", async () => {
    render(<AdminDiscountsContent />);

    const badge = within(await rowFor("Default bulk")).getByText("Not combined");
    expect(badge).toHaveAttribute("title", "When a client applies a promo code, this discount is removed.");
  });

  it("marks discounts that can be combined with promo codes", async () => {
    render(<AdminDiscountsContent />);

    const badge = within(await rowFor("Holiday bulk")).getByText("Combined");
    expect(badge).toHaveAttribute("title", "Clients get this discount and the promo code on the same order.");
  });

  it("treats a discount without the option as not combined", async () => {
    const legacy_discount = makeBulkDiscount({ id: "d3", name: "Legacy bulk" });
    delete (legacy_discount as { allow_promo_code_stacking?: boolean }).allow_promo_code_stacking;
    mock_list.mockResolvedValue([legacy_discount]);

    render(<AdminDiscountsContent />);

    expect(within(await rowFor("Legacy bulk")).getByText("Not combined")).toBeInTheDocument();
  });
});
