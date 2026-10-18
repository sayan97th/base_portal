/**
 * Tests for PasteOverflowBanner — the shared warning shown by every intake
 * table when a paste/import brought more rows than the table has room for.
 * Every intake table's own test file exercises this through real
 * paste/import flows; this file locks in the banner's own rendering rules
 * in isolation (hidden at zero, pluralization, dismiss callback).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PasteOverflowBanner from "@/components/shared/PasteOverflowBanner";

describe("PasteOverflowBanner", () => {
  it("renders nothing when there is no overflow", () => {
    const { container } = render(
      <PasteOverflowBanner overflow_row_count={0} available_row_count={5} onDismiss={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("singularizes both counts when each is exactly one", () => {
    render(<PasteOverflowBanner overflow_row_count={1} available_row_count={1} onDismiss={jest.fn()} />);

    expect(
      screen.getByText(/Only the first 1 row from your paste were filled in/i)
    ).toHaveTextContent(/remaining 1 row were ignored/i);
    expect(screen.getByText(/this table has 1 row \(based on the quantity purchased\)/i)).toBeInTheDocument();
  });

  it("pluralizes both counts when more than one", () => {
    render(<PasteOverflowBanner overflow_row_count={3} available_row_count={7} onDismiss={jest.fn()} />);

    expect(screen.getByText(/Only the first 7 rows/i)).toHaveTextContent(/remaining 3 rows were ignored/i);
    expect(screen.getByText(/this table has 7 rows/i)).toBeInTheDocument();
  });

  it("calls onDismiss when the Dismiss button is clicked", async () => {
    const onDismiss = jest.fn();
    render(<PasteOverflowBanner overflow_row_count={2} available_row_count={5} onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
