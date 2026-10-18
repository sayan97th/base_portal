/**
 * Unit tests for the client-side order-details service.
 *
 * Covers the "defer intake details / Pending Details" feature: a client fills in
 * the deferred intake for an order that was purchased with details deferred
 * (status `pending_details`). Each method PUTs to the product-specific endpoint
 * and returns the parsed `.data` of the API response.
 */

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get:    jest.fn(),
    post:   jest.fn(),
    put:    jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
import { orderDetailsService } from "@/services/client/order-details.service";
import type {
  LinkBuildingDetailsPlacement,
  NewContentDetailsItem,
  KeywordUrlDetailsItem,
} from "@/services/client/order-details.service";

const mocked = apiClient as jest.Mocked<typeof apiClient>;

const order_id = "550e8400-e29b-41d4-a716-446655440000";

const result_data = {
  id:         order_id,
  status:     "new_request",
  is_pending: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── submitLinkBuilding ───────────────────────────────────────────────────────

describe("orderDetailsService.submitLinkBuilding", () => {
  const placements: LinkBuildingDetailsPlacement[] = [
    { id: "p1", keyword: "best running shoes", landing_page: "https://example.com/shoes", exact_match: true },
    { id: "p2", keyword: null, landing_page: null, exact_match: false },
  ];

  it("PUTs to the link-building details endpoint with { placements }", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    await orderDetailsService.submitLinkBuilding(order_id, placements);

    expect(mocked.put).toHaveBeenCalledTimes(1);
    expect(mocked.put).toHaveBeenCalledWith(
      `/api/link-building/orders/${order_id}/details`,
      { placements }
    );
  });

  it("returns the response .data object", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    const result = await orderDetailsService.submitLinkBuilding(order_id, placements);

    expect(result).toEqual(result_data);
  });
});

// ─── submitNewContent ─────────────────────────────────────────────────────────

describe("orderDetailsService.submitNewContent", () => {
  const items: NewContentDetailsItem[] = [
    {
      item_id: "i1",
      intake_rows: [
        {
          keyword_phrase:     "content marketing",
          secondary_keywords: "seo, blogging",
          type_of_content:    "blog",
          notes:              "tone: professional",
        },
      ],
    },
  ];

  it("PUTs to the new-content details endpoint with { items }", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    await orderDetailsService.submitNewContent(order_id, items);

    expect(mocked.put).toHaveBeenCalledTimes(1);
    expect(mocked.put).toHaveBeenCalledWith(
      `/api/new-content/orders/${order_id}/details`,
      { items }
    );
  });

  it("returns the response .data object", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    const result = await orderDetailsService.submitNewContent(order_id, items);

    expect(result).toEqual(result_data);
  });
});

// ─── submitContentOptimization ────────────────────────────────────────────────

describe("orderDetailsService.submitContentOptimization", () => {
  const items: KeywordUrlDetailsItem[] = [
    {
      item_id: "i1",
      intake_rows: [
        {
          primary_keyword:    "on-page seo",
          secondary_keywords: "meta tags",
          content_page_url:   "https://example.com/seo",
          notes:              null,
        },
      ],
    },
  ];

  it("PUTs to the content-optimization details endpoint with { items }", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    await orderDetailsService.submitContentOptimization(order_id, items);

    expect(mocked.put).toHaveBeenCalledTimes(1);
    expect(mocked.put).toHaveBeenCalledWith(
      `/api/content-optimization/orders/${order_id}/details`,
      { items }
    );
  });

  it("returns the response .data object", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    const result = await orderDetailsService.submitContentOptimization(order_id, items);

    expect(result).toEqual(result_data);
  });
});

// ─── submitContentBrief ───────────────────────────────────────────────────────

describe("orderDetailsService.submitContentBrief", () => {
  const items: KeywordUrlDetailsItem[] = [
    {
      item_id: "i1",
      intake_rows: [
        {
          primary_keyword:    "content brief",
          secondary_keywords: null,
          content_page_url:   "https://example.com/brief",
          notes:              "outline only",
        },
      ],
    },
  ];

  it("PUTs to the content-briefs details endpoint with { items }", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    await orderDetailsService.submitContentBrief(order_id, items);

    expect(mocked.put).toHaveBeenCalledTimes(1);
    expect(mocked.put).toHaveBeenCalledWith(
      `/api/content-briefs/orders/${order_id}/details`,
      { items }
    );
  });

  it("returns the response .data object", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    const result = await orderDetailsService.submitContentBrief(order_id, items);

    expect(result).toEqual(result_data);
  });
});
