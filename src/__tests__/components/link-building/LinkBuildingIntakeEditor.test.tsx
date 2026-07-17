/**
 * Tests for LinkBuildingIntakeEditor — the client/admin view for filling in the
 * deferred "Pending Link Details" intake of a link-building order.
 *
 * Verifies row rendering, the completed counter, the pending banner, field
 * editing, the exact-match checkbox toggle, and that saving forwards a trimmed,
 * null-normalized payload and surfaces the success banner once the order leaves
 * the pending state.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LinkBuildingIntakeEditor from "@/components/link-building/orders/LinkBuildingIntakeEditor";
import type { EditorItem } from "@/components/link-building/orders/LinkBuildingIntakeEditor";
import type { OrderDetailsResult } from "@/services/client/order-details.service";

// Passthrough mock for next/link — renders a plain anchor.
jest.mock("next/link", () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

// jsdom does not implement scrollTo; the component calls it after save.
beforeAll(() => {
  window.scrollTo = jest.fn();
});

const KEYWORD_PLACEHOLDER = "e.g. best running shoes";
const LANDING_PLACEHOLDER = "https://example.com/page";

function makePlacement(id: string, overrides: Partial<EditorItem["placements"][number]> = {}) {
  return {
    id,
    keyword:      "",
    landing_page: "",
    exact_match:  false,
    ...overrides,
  };
}

// Two items: one with 3 placements, one with 4 → 7 placements total.
// 4 of them have BOTH keyword and landing_page filled → 4/7 completed.
function makeItems(): EditorItem[] {
  return [
    {
      id:       "item-dr30",
      label:    "DR 30+",
      quantity: 3,
      placements: [
        makePlacement("p1", { keyword: "running shoes", landing_page: "https://a.com/1" }),
        makePlacement("p2", { keyword: "trail shoes", landing_page: "https://a.com/2" }),
        makePlacement("p3", { keyword: "gym shoes" }), // keyword only → not complete
      ],
    },
    {
      id:       "item-dr50",
      label:    "DR 50+",
      quantity: 4,
      placements: [
        makePlacement("p4", { keyword: "hiking boots", landing_page: "https://a.com/4" }),
        makePlacement("p5", { keyword: "climbing gear", landing_page: "https://a.com/5" }),
        makePlacement("p6", { landing_page: "https://a.com/6" }), // landing only → not complete
        makePlacement("p7"), // empty → not complete
      ],
    },
  ];
}

function renderEditor(
  props: Partial<React.ComponentProps<typeof LinkBuildingIntakeEditor>> = {}
) {
  const onSave = props.onSave ?? jest.fn();
  const defaults: React.ComponentProps<typeof LinkBuildingIntakeEditor> = {
    order_id:    "o1",
    order_title: "Q3 Backlinks",
    created_at:  "2026-07-01T00:00:00.000Z",
    status:      "pending_details",
    items:       makeItems(),
    onSave,
    back_href:   "/orders",
  };
  const utils = render(<LinkBuildingIntakeEditor {...defaults} {...props} />);
  return { onSave, ...utils };
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("rendering", () => {
  it("renders a keyword input for every placement across all items", () => {
    renderEditor();

    expect(screen.getAllByPlaceholderText(KEYWORD_PLACEHOLDER)).toHaveLength(7);
    expect(screen.getAllByPlaceholderText(LANDING_PLACEHOLDER)).toHaveLength(7);
  });

  it("renders each item label", () => {
    renderEditor();

    expect(screen.getByText("DR 30+")).toBeInTheDocument();
    expect(screen.getByText("DR 50+")).toBeInTheDocument();
  });
});

// ─── Completed counter ────────────────────────────────────────────────────────

describe("completed counter", () => {
  it("shows how many placements have both keyword and landing page filled", () => {
    renderEditor();

    expect(screen.getByText("4 / 7 completed")).toBeInTheDocument();
  });

  it("updates the counter as fields are completed", () => {
    renderEditor();

    // p3 has a keyword but no landing page — fill it to reach 5/7.
    const landing_inputs = screen.getAllByPlaceholderText(LANDING_PLACEHOLDER);
    fireEvent.change(landing_inputs[2], { target: { value: "https://a.com/3" } });

    expect(screen.getByText("5 / 7 completed")).toBeInTheDocument();
  });
});

// ─── Pending banner ───────────────────────────────────────────────────────────

describe("pending details banner", () => {
  it("shows the amber Pending Link Details banner when status is pending_details", () => {
    renderEditor({ status: "pending_details" });

    expect(screen.getByText(/Pending Link Details/i)).toBeInTheDocument();
  });

  it("does not show the pending banner when status is not pending_details", () => {
    renderEditor({ status: "new_request" });

    expect(screen.queryByText(/Pending Link Details/i)).not.toBeInTheDocument();
  });
});

// ─── Field editing ────────────────────────────────────────────────────────────

describe("field editing", () => {
  it("updates the keyword and landing page inputs on change", () => {
    renderEditor();

    const keyword_inputs = screen.getAllByPlaceholderText(KEYWORD_PLACEHOLDER);
    const landing_inputs = screen.getAllByPlaceholderText(LANDING_PLACEHOLDER);

    fireEvent.change(keyword_inputs[6], { target: { value: "new keyword" } });
    fireEvent.change(landing_inputs[6], { target: { value: "https://new.com" } });

    expect(keyword_inputs[6]).toHaveValue("new keyword");
    expect(landing_inputs[6]).toHaveValue("https://new.com");
  });
});

// ─── Exact match checkbox ─────────────────────────────────────────────────────

describe("exact match control", () => {
  it("renders a checkbox per placement and toggles aria-checked on click", () => {
    renderEditor();

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(7);

    expect(checkboxes[0]).toHaveAttribute("aria-checked", "false");

    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toHaveAttribute("aria-checked", "true");

    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0]).toHaveAttribute("aria-checked", "false");
  });
});

// ─── Save ─────────────────────────────────────────────────────────────────────

describe("saving details", () => {
  it("calls onSave once with a trimmed, null-normalized placement payload", async () => {
    const onSave = jest.fn<Promise<OrderDetailsResult>, [unknown]>().mockResolvedValue({
      id:         "o1",
      status:     "new_request",
      is_pending: false,
    });

    renderEditor({ onSave });

    // Give p7 (last row, currently empty) values with surrounding whitespace.
    const keyword_inputs = screen.getAllByPlaceholderText(KEYWORD_PLACEHOLDER);
    const landing_inputs = screen.getAllByPlaceholderText(LANDING_PLACEHOLDER);
    fireEvent.change(keyword_inputs[6], { target: { value: "  padded keyword  " } });
    fireEvent.change(landing_inputs[6], { target: { value: "  https://padded.com  " } });

    fireEvent.click(screen.getByRole("button", { name: "Save Details" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    const payload = onSave.mock.calls[0][0] as Array<{
      id: string;
      keyword: string | null;
      landing_page: string | null;
      exact_match: boolean;
    }>;

    // One entry per placement.
    expect(payload).toHaveLength(7);

    // Known filled row p1.
    expect(payload).toContainEqual({
      id:           "p1",
      keyword:      "running shoes",
      landing_page: "https://a.com/1",
      exact_match:  false,
    });

    // p7: trimmed values.
    expect(payload).toContainEqual({
      id:           "p7",
      keyword:      "padded keyword",
      landing_page: "https://padded.com",
      exact_match:  false,
    });

    // p6 had landing only → keyword normalized to null.
    expect(payload).toContainEqual({
      id:           "p6",
      keyword:      null,
      landing_page: "https://a.com/6",
      exact_match:  false,
    });
  });

  it("shows the success banner after a save that moves the order out of pending", async () => {
    const onSave = jest.fn<Promise<OrderDetailsResult>, [unknown]>().mockResolvedValue({
      id:         "o1",
      status:     "new_request",
      is_pending: false,
    });

    renderEditor({ onSave });

    fireEvent.click(screen.getByRole("button", { name: "Save Details" }));

    expect(await screen.findByText(/turnaround clock has\s+started/i)).toBeInTheDocument();
    expect(screen.getByText(/Details submitted/i)).toBeInTheDocument();

    // The pending banner is gone once the status transitions.
    expect(screen.queryByText(/Pending Link Details/i)).not.toBeInTheDocument();
  });
});
