/**
 * Unit tests for the admin-side order-details service.
 *
 * Mirrors the client order-details service but targets the admin endpoints,
 * letting an admin fill an order's deferred intake on the client's behalf. Each
 * method PUTs to the product-specific admin endpoint and returns the parsed
 * `.data` of the API response.
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
import { adminOrderDetailsService } from "@/services/admin/order-details.service";
import type {
  LinkBuildingDetailsPlacement,
  NewContentDetailsItem,
  KeywordUrlDetailsItem,
} from "@/services/client/order-details.service";

const mocked = apiClient as jest.Mocked<typeof apiClient>;

const order_id = "9d3f6c00-1111-2222-3333-444455556666";

const result_data = {
  id:         order_id,
  status:     "new_request",
  is_pending: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── submitLinkBuilding ───────────────────────────────────────────────────────

describe("adminOrderDetailsService.submitLinkBuilding", () => {
  const placements: LinkBuildingDetailsPlacement[] = [
    { id: "p1", keyword: "buy widgets", landing_page: "https://example.com/widgets", exact_match: false },
  ];

  it("PUTs to the admin link-building-details endpoint with { placements }", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    await adminOrderDetailsService.submitLinkBuilding(order_id, placements);

    expect(mocked.put).toHaveBeenCalledTimes(1);
    expect(mocked.put).toHaveBeenCalledWith(
      `/api/admin/orders/${order_id}/link-building-details`,
      { placements }
    );
  });

  it("returns the response .data object", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    const result = await adminOrderDetailsService.submitLinkBuilding(order_id, placements);

    expect(result).toEqual(result_data);
  });
});

// ─── submitNewContent ─────────────────────────────────────────────────────────

describe("adminOrderDetailsService.submitNewContent", () => {
  const items: NewContentDetailsItem[] = [
    {
      item_id: "i1",
      intake_rows: [
        {
          keyword_phrase:     "email marketing",
          secondary_keywords: "newsletters",
          type_of_content:    "guide",
          notes:              null,
        },
      ],
    },
  ];

  it("PUTs to the admin new-content-details endpoint with { items }", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    await adminOrderDetailsService.submitNewContent(order_id, items);

    expect(mocked.put).toHaveBeenCalledTimes(1);
    expect(mocked.put).toHaveBeenCalledWith(
      `/api/admin/orders/${order_id}/new-content-details`,
      { items }
    );
  });

  it("returns the response .data object", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    const result = await adminOrderDetailsService.submitNewContent(order_id, items);

    expect(result).toEqual(result_data);
  });
});

// ─── submitContentOptimization ────────────────────────────────────────────────

describe("adminOrderDetailsService.submitContentOptimization", () => {
  const items: KeywordUrlDetailsItem[] = [
    {
      item_id: "i1",
      intake_rows: [
        {
          primary_keyword:    "page speed",
          secondary_keywords: "core web vitals",
          content_page_url:   "https://example.com/speed",
          notes:              "prioritize LCP",
        },
      ],
    },
  ];

  it("PUTs to the admin content-optimization-details endpoint with { items }", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    await adminOrderDetailsService.submitContentOptimization(order_id, items);

    expect(mocked.put).toHaveBeenCalledTimes(1);
    expect(mocked.put).toHaveBeenCalledWith(
      `/api/admin/orders/${order_id}/content-optimization-details`,
      { items }
    );
  });

  it("returns the response .data object", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    const result = await adminOrderDetailsService.submitContentOptimization(order_id, items);

    expect(result).toEqual(result_data);
  });
});

// ─── submitContentBrief ───────────────────────────────────────────────────────

describe("adminOrderDetailsService.submitContentBrief", () => {
  const items: KeywordUrlDetailsItem[] = [
    {
      item_id: "i1",
      intake_rows: [
        {
          primary_keyword:    "keyword research",
          secondary_keywords: null,
          content_page_url:   "https://example.com/research",
          notes:              null,
        },
      ],
    },
  ];

  it("PUTs to the admin content-brief-details endpoint with { items }", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    await adminOrderDetailsService.submitContentBrief(order_id, items);

    expect(mocked.put).toHaveBeenCalledTimes(1);
    expect(mocked.put).toHaveBeenCalledWith(
      `/api/admin/orders/${order_id}/content-brief-details`,
      { items }
    );
  });

  it("returns the response .data object", async () => {
    mocked.put.mockResolvedValueOnce({ data: result_data } as never);

    const result = await adminOrderDetailsService.submitContentBrief(order_id, items);

    expect(result).toEqual(result_data);
  });
});
