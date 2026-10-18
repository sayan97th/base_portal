/**
 * Tests for KeywordEntryStep — the thin wrapper that renders one
 * LinkBuildingIntakeTable per selected Link Building tier and re-scopes its
 * callbacks to that tier's id. LinkBuildingIntakeTable.test.tsx already
 * covers paste/import behavior in depth; this file only locks in the
 * wiring: the right tier_id reaches onKeywordChange/onKeywordsPaste, and
 * the Order Title/Notes fields forward their values.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KeywordEntryStep, {
  type KeywordData,
} from "@/components/link-building/KeywordEntryStep";
import type { OrderSummaryItem } from "@/components/link-building/LinkBuildingOrderSummary";

function makeSelectedItems(): OrderSummaryItem[] {
  return [
    { id: "dr30", label: "DR 30+", quantity: 2, unit_price: 100 },
    { id: "dr50", label: "DR 50+", quantity: 1, unit_price: 150 },
  ];
}

function makeKeywordData(): KeywordData {
  return {
    dr30: [
      { keyword: "", landing_page: "", exact_match: false },
      { keyword: "", landing_page: "", exact_match: false },
    ],
    dr50: [{ keyword: "", landing_page: "", exact_match: false }],
  };
}

function renderStep(overrides: Partial<React.ComponentProps<typeof KeywordEntryStep>> = {}) {
  const onKeywordChange = jest.fn();
  const onKeywordsPaste = jest.fn();
  const onOrderTitleChange = jest.fn();
  const onOrderNotesChange = jest.fn();

  render(
    <KeywordEntryStep
      selected_items={makeSelectedItems()}
      keyword_data={makeKeywordData()}
      order_title=""
      order_notes=""
      onKeywordChange={onKeywordChange}
      onKeywordsPaste={onKeywordsPaste}
      onOrderTitleChange={onOrderTitleChange}
      onOrderNotesChange={onOrderNotesChange}
      {...overrides}
    />
  );

  return { onKeywordChange, onKeywordsPaste, onOrderTitleChange, onOrderNotesChange };
}

describe("KeywordEntryStep", () => {
  it("renders one intake table per selected tier, each with its own row count", () => {
    renderStep();

    expect(screen.getByText("DR 30+")).toBeInTheDocument();
    expect(screen.getByText("DR 50+")).toBeInTheDocument();
    // 2 rows for DR 30+ + 1 row for DR 50+ = 3 keyword inputs total.
    expect(screen.getAllByPlaceholderText("Enter keyword...")).toHaveLength(3);
  });

  it("scopes a single-field edit to the tier it belongs to", async () => {
    const { onKeywordChange } = renderStep();

    // Third keyword input belongs to the DR 50+ table (2 rows for DR 30+ first).
    const inputs = screen.getAllByPlaceholderText("Enter keyword...");
    await userEvent.type(inputs[2], "a");

    expect(onKeywordChange).toHaveBeenCalledWith("dr50", 0, "keyword", "a");
  });

  it("scopes a bulk paste to the tier it belongs to", () => {
    const { onKeywordsPaste } = renderStep();

    const inputs = screen.getAllByPlaceholderText("Enter keyword...");
    // Paste two rows into the DR 30+ table (its first input, index 0).
    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => "kw1\thttps://a.com\nkw2\thttps://b.com" },
    });

    expect(onKeywordsPaste).toHaveBeenCalledWith("dr30", [
      { keyword: "kw1", landing_page: "https://a.com", exact_match: false },
      { keyword: "kw2", landing_page: "https://b.com", exact_match: false },
    ]);
  });

  it("forwards Order Title and Order Notes edits", async () => {
    const { onOrderTitleChange, onOrderNotesChange } = renderStep();

    const [title_input, notes_textarea] = screen.getAllByPlaceholderText("Optional");
    await userEvent.type(title_input, "Q3 Order");
    expect(onOrderTitleChange).toHaveBeenCalled();

    await userEvent.type(notes_textarea, "please expedite");
    expect(onOrderNotesChange).toHaveBeenCalled();
  });

  it("mentions both paste and import in the info banner", () => {
    renderStep();
    expect(screen.getByText(/paste rows from a spreadsheet/i)).toBeInTheDocument();
    expect(screen.getByText("Import", { selector: "strong" })).toBeInTheDocument();
  });
});
