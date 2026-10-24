/**
 * Tests for the read only Original Order view: the order exactly as the client
 * submitted it, with what changed since on the Link Building Orders table.
 */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminOriginalOrderContent from "@/components/admin/orders/AdminOriginalOrderContent";
import type { OriginalOrderDetails, OriginalOrderSnapshot } from "@/types/admin/original-order";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

jest.mock("@/services/admin/order.service", () => ({
  getAdminOriginalOrder: jest.fn(),
}));

import { getAdminOriginalOrder } from "@/services/admin/order.service";

const mockGetOriginal = getAdminOriginalOrder as jest.MockedFunction<typeof getAdminOriginalOrder>;

function makeSnapshot(overrides: Partial<OriginalOrderSnapshot> = {}): OriginalOrderSnapshot {
  return {
    id: "snap-1",
    type: "placed",
    payment_method: "Credit Card",
    is_backfilled: false,
    captured_at: "2026-10-15T15:00:00+00:00",
    captured_by: { id: 3, name: "Weave Buyer" },
    payload: {
      schema_version: 1,
      order: {
        id: "order-1",
        order_title: "Weave links",
        order_notes: "Please prioritize",
        status: "new_request",
        subtotal_before_discount: 600,
        total_amount: 600,
        session_id: null,
        session_title: null,
        created_at: "2026-10-15T15:00:00+00:00",
      },
      customer: { id: 3, first_name: "Weave", last_name: "Buyer", email: "buyer@getweave.com", company: "Weave" },
      billing: null,
      coupons: [],
      items: [{
        id: "item-1",
        dr_tier_id: "dr60",
        dr_tier_label: "DR 60+",
        quantity: 2,
        unit_price: 300,
        subtotal: 600,
        placements: [
          {
            id: "p1", order_id: "BL-25687", row_index: 0, keyword: "other fatigue icd 10",
            landing_page: "https://www.getweave.com/fatigue-icd-10/", exact_match: true,
            link_type: "DR 60+ External", client: "Weave", status: "New Request", request_date: "10/15/2026",
          },
          {
            id: "p2", order_id: "BL-25689", row_index: 1, keyword: "dental front office training",
            landing_page: "https://www.getweave.com/dental-front-office-training/", exact_match: false,
            link_type: "DR 60+ External", client: "Weave", status: "New Request", request_date: "10/15/2026",
          },
        ],
      }],
    },
    ...overrides,
  };
}

function makeDetails(overrides: Partial<OriginalOrderDetails> = {}): OriginalOrderDetails {
  return {
    order: {
      id: "order-1",
      order_title: "Weave links",
      status: "processing",
      session_id: null,
      created_at: "2026-10-15T15:00:00+00:00",
      product_type: "link_building",
      user: null,
    },
    invoice: null,
    snapshots: [makeSnapshot()],
    current_placements: {
      p1: {
        order_id: "BL-25730", keyword: "senior living", landing_page: "https://mather.com/a",
        exact_match: true, link_type: "DR 60+ External", client: "Mather", status: "New Request", request_date: "10/15/2026",
      },
    },
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

it("shows the placements as submitted, with the values they hold now", async () => {
  mockGetOriginal.mockResolvedValue(makeDetails());
  render(<AdminOriginalOrderContent order_id="order-1" />);

  expect(await screen.findByText("other fatigue icd 10")).toBeInTheDocument();
  expect(screen.getByText("BL-25687")).toBeInTheDocument();
  expect(screen.getByText("Now: senior living")).toBeInTheDocument();
  expect(screen.getByText("Now: Mather")).toBeInTheDocument();
  expect(screen.getByText("Now: BL-25730")).toBeInTheDocument();
  expect(screen.getByText("Removed from the table")).toBeInTheDocument();
  expect(screen.getByText("2 of 2 placements changed since this copy.")).toBeInTheDocument();
  expect(screen.getByText(/exactly as the client submitted it at checkout/)).toBeInTheDocument();
  expect(screen.getByText("Credit Card")).toBeInTheDocument();
});

it("hides the current values on request", async () => {
  mockGetOriginal.mockResolvedValue(makeDetails());
  render(<AdminOriginalOrderContent order_id="order-1" />);
  await screen.findByText("other fatigue icd 10");

  fireEvent.click(screen.getByLabelText("Show current values"));

  expect(screen.queryByText("Now: senior living")).not.toBeInTheDocument();
});

it("copies the original rows as tab separated text for a spreadsheet", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.assign(navigator, { clipboard: { writeText } });
  mockGetOriginal.mockResolvedValue(makeDetails());
  render(<AdminOriginalOrderContent order_id="order-1" />);
  await screen.findByText("other fatigue icd 10");

  fireEvent.click(screen.getByRole("button", { name: /copy rows/i }));

  await waitFor(() => expect(writeText).toHaveBeenCalled());
  const lines = (writeText.mock.calls[0][0] as string).split("\n");
  expect(lines[0]).toBe("Order ID\tCompany\tLink Type\tKeyword\tLanding Page\tExact Match");
  expect(lines[1]).toBe("BL-25687\tWeave\tDR 60+ External\tother fatigue icd 10\thttps://www.getweave.com/fatigue-icd-10/\tYes");
});

it("warns when the copy was backfilled instead of taken at checkout", async () => {
  mockGetOriginal.mockResolvedValue(makeDetails({ snapshots: [makeSnapshot({ is_backfilled: true })] }));
  render(<AdminOriginalOrderContent order_id="order-1" />);

  expect(await screen.findByText(/placed before original copies were kept/)).toBeInTheDocument();
});

it("switches between the checkout copy and later detail submissions", async () => {
  const details_copy = makeSnapshot({ id: "snap-2", type: "details_submitted", captured_at: "2026-10-18T10:00:00+00:00" });
  details_copy.payload.items[0].placements[0] = { ...details_copy.payload.items[0].placements[0], keyword: "updated by client" };
  mockGetOriginal.mockResolvedValue(makeDetails({ snapshots: [makeSnapshot(), details_copy] }));
  render(<AdminOriginalOrderContent order_id="order-1" />);
  await screen.findByText("other fatigue icd 10");

  fireEvent.click(screen.getByRole("tab", { name: /Details submitted/ }));

  expect(screen.getByText("updated by client")).toBeInTheDocument();
});

it("explains when the order is not a Link Building order", async () => {
  mockGetOriginal.mockRejectedValue({ status_code: 404 });
  render(<AdminOriginalOrderContent order_id="order-x" />);

  expect(await screen.findByText("Original order details are kept for Link Building orders only.")).toBeInTheDocument();
});
