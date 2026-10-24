/**
 * Tests for the Google Sheets style summary of the selected cells shown at the
 * bottom of the Link Building Orders table.
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SelectionStatsBar from "@/components/admin/dashboard/SelectionStatsBar";
import { computeRangeStats } from "@/lib/spreadsheet-navigation";

describe("SelectionStatsBar", () => {
  beforeEach(() => localStorage.clear());

  it("renders nothing without a multi cell selection", () => {
    const { container } = render(<SelectionStatsBar stats={null} cell_count={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the Sum of numeric cells", () => {
    render(<SelectionStatsBar stats={computeRangeStats(["1,000", "250", "Live"])} cell_count={3} />);
    expect(screen.getByRole("button", { name: /Sum:\s*1,250/ })).toBeInTheDocument();
  });

  it("shows the Count of text cells", () => {
    render(<SelectionStatsBar stats={computeRangeStats(["Live", "Pending", ""])} cell_count={3} />);
    expect(screen.getByRole("button", { name: /Count:\s*2/ })).toBeInTheDocument();
  });

  it("lists every statistic and remembers the one picked", () => {
    const stats = computeRangeStats(["10", "30", "Live"]);
    const { unmount } = render(<SelectionStatsBar stats={stats} cell_count={3} />);

    fireEvent.click(screen.getByRole("button", { name: /Sum:/ }));
    expect(screen.getByText("3 cells selected")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(6);

    fireEvent.click(screen.getByRole("menuitemradio", { name: /Average/ }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Average:\s*20/ })).toBeInTheDocument();

    unmount();
    render(<SelectionStatsBar stats={stats} cell_count={3} />);
    expect(screen.getByRole("button", { name: /Average:\s*20/ })).toBeInTheDocument();
  });

  it("offers only the counts for text cells", () => {
    render(<SelectionStatsBar stats={computeRangeStats(["Live", "Pending"])} cell_count={2} />);
    fireEvent.click(screen.getByRole("button", { name: /Count:/ }));
    expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual(["Count2", "Count Numbers0"]);
  });

  it("closes the menu with Escape", () => {
    render(<SelectionStatsBar stats={computeRangeStats(["1", "2"])} cell_count={2} />);
    fireEvent.click(screen.getByRole("button", { name: /Sum:/ }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
