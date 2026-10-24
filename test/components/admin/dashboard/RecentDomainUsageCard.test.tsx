/**
 * Tests for the warning card of a Partnership cell highlighted in red: hovering
 * or selecting the cell explains that the domain was already used for the row's
 * landing page in the last months, and which order used it.
 */

import React, { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import RecentDomainUsageCard from "@/components/admin/dashboard/RecentDomainUsageCard";
import type { LinkBuildingRecentDomainUsage } from "@/types/admin/link-building-order";

function makeUsage(overrides: Partial<LinkBuildingRecentDomainUsage> = {}): LinkBuildingRecentDomainUsage {
  return { count: 1, last_order_id: "BL-100", last_request_date: "09/10/2026", window_months: 3, ...overrides };
}

function Cell({ usage = makeUsage(), is_active = false }: { usage?: LinkBuildingRecentDomainUsage; is_active?: boolean }) {
  const [cell_el, setCellEl] = useState<HTMLTableCellElement | null>(null);
  return (
    <table>
      <tbody>
        <tr>
          <td ref={setCellEl} data-testid="partnership-cell">
            techkaya.com
            <RecentDomainUsageCard
              usage={usage}
              landing_page="https://client.com/services"
              anchor_el={cell_el}
              is_active={is_active}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

async function hoverCell() {
  fireEvent.mouseEnter(screen.getByTestId("partnership-cell"));
  await act(async () => {
    jest.advanceTimersByTime(400);
  });
}

describe("RecentDomainUsageCard", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("stays hidden until the cell is hovered", () => {
    render(<Cell />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("explains the warning on hover and hides it when the mouse leaves", async () => {
    render(<Cell />);

    await hoverCell();

    const card = screen.getByRole("tooltip");
    expect(card).toHaveTextContent("Domain used recently");
    expect(card).toHaveTextContent("This domain was already used for this landing page in the last 3 months.");
    expect(card).toHaveTextContent("BL-100");
    expect(card).toHaveTextContent("09/10/2026");
    expect(card).toHaveTextContent("client.com/services");
    expect(card).toHaveTextContent("Choose a different site for this landing page.");
    expect(card).toHaveTextContent("Cancelled, Rejected and Not Approved orders are not counted.");

    fireEvent.mouseLeave(screen.getByTestId("partnership-cell"));
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("names the latest order when the domain was used several times", async () => {
    render(<Cell usage={makeUsage({ count: 2, last_order_id: "BL-200" })} />);

    await hoverCell();

    const card = screen.getByRole("tooltip");
    expect(card).toHaveTextContent("This domain was already used 2 times for this landing page in the last 3 months.");
    expect(card).toHaveTextContent("Latest order");
    expect(card).toHaveTextContent("BL-200");
  });

  it("stays open while the cell is selected, for keyboard users", () => {
    render(<Cell is_active />);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Domain used recently");
  });

  it("never uses em dashes", async () => {
    render(<Cell usage={makeUsage({ count: 3 })} />);
    await hoverCell();
    expect(screen.getByRole("tooltip").textContent).not.toContain("—");
  });
});
