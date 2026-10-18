/**
 * Integration tests for UnifiedIntakeStep — the screen that stitches
 * together the four per-product intake tables (Link Building, New Content,
 * Content Optimization, Content Briefs), the "Review" validation gate, and
 * the "Skip for now" deferred-details shortcut.
 *
 * These tests back a real CartContext mock with local React state (see
 * `renderStep`/`Harness` below) so that a paste or edit performed on a
 * table genuinely round-trips through `updateLinkBuildingKeywords` etc. and
 * is reflected back into the next render — the same way the real
 * CartContext behaves. This is what lets us assert that filling a table via
 * bulk paste actually clears the "Review" validation error, not just that
 * the right callback was called with the right arguments (already covered
 * per-table in the individual table test files).
 */

import React, { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCart } from "@/context/CartContext";
import UnifiedIntakeStep from "@/components/shared/UnifiedIntakeStep";
import type { KeywordRow } from "@/components/link-building/KeywordEntryStep";
import type {
  CartItem,
  CartIntakeRow,
  ContentOptimizationIntakeRow,
} from "@/types/client/unified-cart";

jest.mock("@/context/CartContext", () => ({ useCart: jest.fn() }));
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>;

function lbItem(tier_id: string, tier_name: string, quantity: number): CartItem {
  return { cart_item_id: tier_id, product_type: "link_building", tier_id, tier_name, quantity, unit_price: 100 };
}
function ncItem(tier_id: string, tier_name: string, quantity: number): CartItem {
  return { cart_item_id: tier_id, product_type: "new_content", tier_id, tier_name, quantity, unit_price: 100 };
}
function coItem(tier_id: string, tier_name: string, quantity: number): CartItem {
  return { cart_item_id: tier_id, product_type: "content_optimization", tier_id, tier_name, quantity, unit_price: 100 };
}
function cbItem(tier_id: string, tier_name: string, quantity: number): CartItem {
  return { cart_item_id: tier_id, product_type: "content_brief", tier_id, tier_name, quantity, unit_price: 100 };
}

/** Backs useCart() with real React state so writes round-trip into the next render. */
function Harness({
  items,
  on_next,
  on_skip,
}: {
  items: CartItem[];
  on_next: jest.Mock;
  on_skip?: jest.Mock;
}) {
  const [keyword_data, setKeywordData] = useState<Record<string, KeywordRow[]>>({});
  const [nc_data, setNcData] = useState<Record<string, CartIntakeRow[][]>>({});
  const [co_data, setCoData] = useState<Record<string, ContentOptimizationIntakeRow[]>>({});
  const [cb_data, setCbData] = useState<Record<string, ContentOptimizationIntakeRow[]>>({});
  const [order_title, setOrderTitleState] = useState("");
  const [order_notes, setOrderNotesState] = useState("");

  mockUseCart.mockReturnValue({
    items,
    getKeywordDataForTier: (tier_id: string) => keyword_data[tier_id] ?? [],
    updateLinkBuildingKeywords: (tier_id: string, rows: KeywordRow[]) =>
      setKeywordData((prev) => ({ ...prev, [tier_id]: rows })),
    getIntakeDataForTier: (tier_id: string) => nc_data[tier_id] ?? [],
    updateNewContentIntakeData: (tier_id: string, rows: CartIntakeRow[][]) =>
      setNcData((prev) => ({ ...prev, [tier_id]: rows })),
    getContentOptimizationIntakeDataForTier: (tier_id: string) => co_data[tier_id] ?? [],
    updateContentOptimizationIntakeData: (tier_id: string, rows: ContentOptimizationIntakeRow[]) =>
      setCoData((prev) => ({ ...prev, [tier_id]: rows })),
    getContentBriefIntakeDataForTier: (tier_id: string) => cb_data[tier_id] ?? [],
    updateContentBriefIntakeData: (tier_id: string, rows: ContentOptimizationIntakeRow[]) =>
      setCbData((prev) => ({ ...prev, [tier_id]: rows })),
    order_title,
    order_notes,
    setOrderTitle: setOrderTitleState,
    setOrderNotes: setOrderNotesState,
  } as ReturnType<typeof useCart>);

  return <UnifiedIntakeStep onBack={jest.fn()} onNext={on_next} onSkip={on_skip} />;
}

function renderStep(items: CartItem[], on_skip?: jest.Mock) {
  const on_next = jest.fn();
  const utils = render(<Harness items={items} on_next={on_next} on_skip={on_skip} />);
  return { on_next, ...utils };
}

function pasteInto(input: HTMLElement, text: string): void {
  fireEvent.paste(input, { clipboardData: { getData: () => text } });
}

beforeAll(() => {
  window.scrollTo = jest.fn();
});

describe("UnifiedIntakeStep — Link Building validation", () => {
  it("blocks Review with empty placements and shows the Link Building message", async () => {
    const { on_next } = renderStep([lbItem("dr30", "DR 30+", 2)]);

    await userEvent.click(screen.getByRole("button", { name: /^Review$/ }));

    expect(
      screen.getByText(/keyword and landing page for every Link Building placement/i)
    ).toBeInTheDocument();
    expect(on_next).not.toHaveBeenCalled();
  });

  it("clears the error and proceeds once a bulk paste fills every placement", async () => {
    const { on_next } = renderStep([lbItem("dr30", "DR 30+", 2)]);

    await userEvent.click(screen.getByRole("button", { name: /^Review$/ }));
    expect(screen.getByText(/Link Building placement/i)).toBeInTheDocument();

    const [first_keyword_input] = screen.getAllByPlaceholderText("Enter keyword...");
    pasteInto(first_keyword_input, "kw1\thttps://a.com\nkw2\thttps://b.com");

    expect(screen.queryByText(/Link Building placement/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^Review$/ }));
    expect(on_next).toHaveBeenCalledTimes(1);
  });
});

describe("UnifiedIntakeStep — New Content validation", () => {
  it("requires a keyword phrase before checking Type of Content", async () => {
    renderStep([ncItem("nc-basic", "Basic Article", 1)]);

    await userEvent.click(screen.getByRole("button", { name: /^Review$/ }));

    expect(screen.getByText(/keyword phrase for every New Content row/i)).toBeInTheDocument();
  });

  it("requires Type of Content once the keyword phrase is filled, and flags the select", async () => {
    renderStep([ncItem("nc-basic", "Basic Article", 1)]);

    await userEvent.type(screen.getByPlaceholderText("e.g. seo content strategy"), "seo tips");
    await userEvent.click(screen.getByRole("button", { name: /^Review$/ }));

    expect(screen.getByText(/Type of Content for every New Content row/i)).toBeInTheDocument();
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.className).toMatch(/ring-red-300/);
  });
});

describe("UnifiedIntakeStep — Content Optimization / Content Brief validation", () => {
  it("requires primary keyword and content page URL for Content Optimization", async () => {
    renderStep([coItem("co-800", "800-1,599 Words", 1)]);

    await userEvent.click(screen.getByRole("button", { name: /^Review$/ }));

    expect(
      screen.getByText(/primary keyword and content page URL for every Content Optimization row/i)
    ).toBeInTheDocument();
  });

  it("requires primary keyword and current live URL for Content Briefs", async () => {
    renderStep([cbItem("cb-basic", "Content Brief", 1)]);

    await userEvent.click(screen.getByRole("button", { name: /^Review$/ }));

    expect(
      screen.getByText(/primary keyword and current live URL for every Content Brief row/i)
    ).toBeInTheDocument();
  });
});

describe("UnifiedIntakeStep — multi-section behavior", () => {
  it("shows a section badge per product type once more than one is present", () => {
    renderStep([lbItem("dr30", "DR 30+", 1), ncItem("nc-basic", "Basic Article", 1)]);

    expect(screen.getByText("Link Building")).toBeInTheDocument();
    expect(screen.getByText("New Content")).toBeInTheDocument();
  });

  it("proceeds once every present section is complete", async () => {
    const { on_next } = renderStep([lbItem("dr30", "DR 30+", 1), ncItem("nc-basic", "Basic Article", 1)]);

    const [keyword_input] = screen.getAllByPlaceholderText("Enter keyword...");
    pasteInto(keyword_input, "kw1\thttps://a.com");

    await userEvent.type(screen.getByPlaceholderText("e.g. seo content strategy"), "seo tips");
    await userEvent.selectOptions(screen.getByRole("combobox"), "Blog Article");

    await userEvent.click(screen.getByRole("button", { name: /^Review$/ }));
    expect(on_next).toHaveBeenCalledTimes(1);
  });
});

describe("UnifiedIntakeStep — Skip for now", () => {
  it("does not render the skip banner when onSkip is not provided", () => {
    renderStep([lbItem("dr30", "DR 30+", 1)]);
    expect(screen.queryByRole("button", { name: /Skip for now/i })).not.toBeInTheDocument();
  });

  it("renders the skip banner and calls onSkip when provided, without requiring valid data", async () => {
    const on_skip = jest.fn();
    renderStep([lbItem("dr30", "DR 30+", 1)], on_skip);

    expect(screen.getByText(/Pending Details/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Skip for now/i }));

    expect(on_skip).toHaveBeenCalledTimes(1);
  });
});
