/**
 * Unit tests for the admin link-building-dashboard service.
 *
 * Verifies that each function targets the correct API endpoint, sends the
 * expected HTTP verb, and (for helpers like buildLboPayload / parseApiErrorMessage)
 * produces the correct output without making any real network calls.
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
import {
  listAdminUsersForSelect,
  listClientUsersForSelect,
  listLinkBuildingOrders,
  createLinkBuildingOrder,
  updateLinkBuildingOrder,
  deleteLinkBuildingOrder,
  batchUpdateLinkBuildingOrders,
  buildLboPayload,
  parseApiErrorMessage,
  getMissingLboFields,
} from "@/services/admin/link-building-dashboard.service";
import type { LinkBuildingOrderRow } from "@/types/admin/link-building-order";

const mocked = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => jest.clearAllMocks());

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<LinkBuildingOrderRow> = {}): LinkBuildingOrderRow {
  return {
    id:                         "uuid-1",
    order_id:                   "BL-1",
    team_specific_link_id:      "",
    link_type:                  "DR 30+ External",
    client:                     "Acme Corp",
    keyword:                    "seo tools",
    landing_page:               "https://acme.com",
    exact_match:                "No",
    notes:                      "",
    internal_notes:             "",
    request_date:               "06/01/2026",
    estimated_delivery_date:    "07/01/2026",
    estimated_turnaround_days:  "30",
    link_builder:               "",
    pen_name:                   "",
    partnership:                "",
    partnership_check:          "",
    article_title:              "",
    article:                    "",
    status:                     "New Request",
    live_link:                  "",
    live_link_date:             "",
    dr_lbs:                     "",
    posting_fee_lbs:            "",
    current_traffic:            "",
    dr_formula:                 "",
    current_poc:                "",
    current_price:              "",
    lb_tl_approval:             "",
    approval_date:              "",
    final_price:                "",
    currency:                   "USD",
    user_id:                    null,
    admin_team_id:              null,
    assigned_admin_user_id:     null,
    ...overrides,
  };
}

// ─── listAdminUsersForSelect ──────────────────────────────────────────────────

describe("listAdminUsersForSelect", () => {
  it("calls the assignable-users endpoint via GET", async () => {
    mocked.get.mockResolvedValueOnce({ data: [] } as never);

    await listAdminUsersForSelect();

    expect(mocked.get).toHaveBeenCalledWith(
      "/api/admin/link-building-orders/assignable-users"
    );
  });

  it("returns the data array from the response", async () => {
    const users = [{ id: 1, name: "Jane Admin", email: "jane@97th.com", avatar_url: null }];
    mocked.get.mockResolvedValueOnce({ data: users } as never);

    const result = await listAdminUsersForSelect();

    expect(result).toEqual(users);
  });
});

// ─── listClientUsersForSelect ─────────────────────────────────────────────────

describe("listClientUsersForSelect", () => {
  it("calls the assignable-clients endpoint via GET", async () => {
    mocked.get.mockResolvedValueOnce({ data: [] } as never);

    await listClientUsersForSelect();

    expect(mocked.get).toHaveBeenCalledWith(
      "/api/admin/link-building-orders/assignable-clients"
    );
  });

  it("returns client entries with a company field", async () => {
    const clients = [
      { id: 10, name: "Tyler Smith", email: "tyler@acme.com", avatar_url: null, company: "Acme Corp" },
    ];
    mocked.get.mockResolvedValueOnce({ data: clients } as never);

    const result = await listClientUsersForSelect();

    expect(result[0]).toHaveProperty("company", "Acme Corp");
    expect(result[0]).toHaveProperty("name", "Tyler Smith");
  });
});

// ─── listLinkBuildingOrders ───────────────────────────────────────────────────

describe("listLinkBuildingOrders", () => {
  it("POSTs to the search endpoint", async () => {
    mocked.post.mockResolvedValueOnce({
      data: [], current_page: 1, last_page: 1, per_page: 50, total: 0, from: null, to: null,
    } as never);

    await listLinkBuildingOrders({});

    expect(mocked.post).toHaveBeenCalledWith(
      "/api/admin/link-building-orders/search",
      expect.anything()
    );
  });

  it("forwards all filter fields in the request body", async () => {
    mocked.post.mockResolvedValueOnce({
      data: [], current_page: 1, last_page: 1, per_page: 50, total: 0, from: null, to: null,
    } as never);

    await listLinkBuildingOrders({ status: "Live", client_user_id: 42, per_page: 100 });

    const [, body] = mocked.post.mock.calls[0];
    expect(body).toMatchObject({ status: "Live", client_user_id: 42, per_page: 100 });
  });
});

// ─── createLinkBuildingOrder ──────────────────────────────────────────────────

describe("createLinkBuildingOrder", () => {
  it("POSTs to the link-building-orders endpoint", async () => {
    mocked.post.mockResolvedValueOnce({ message: "Created", data: makeRow() } as never);

    const row = makeRow();
    await createLinkBuildingOrder(buildLboPayload(row));

    expect(mocked.post).toHaveBeenCalledWith(
      "/api/admin/link-building-orders",
      expect.objectContaining({ client: "Acme Corp" })
    );
  });
});

// ─── updateLinkBuildingOrder ──────────────────────────────────────────────────

describe("updateLinkBuildingOrder", () => {
  it("PUTs to the placement-specific URL", async () => {
    mocked.put.mockResolvedValueOnce({ message: "Updated", data: makeRow() } as never);

    await updateLinkBuildingOrder("uuid-1", buildLboPayload(makeRow()));

    expect(mocked.put).toHaveBeenCalledWith(
      "/api/admin/link-building-orders/uuid-1",
      expect.anything()
    );
  });

  it("strips order_id from the PUT body", async () => {
    mocked.put.mockResolvedValueOnce({ message: "Updated", data: makeRow() } as never);

    await updateLinkBuildingOrder("uuid-1", buildLboPayload(makeRow({ order_id: "BL-1" })));

    const [, body] = mocked.put.mock.calls[0];
    expect(body).not.toHaveProperty("order_id");
  });
});

// ─── deleteLinkBuildingOrder ──────────────────────────────────────────────────

describe("deleteLinkBuildingOrder", () => {
  it("calls DELETE on the correct URL", async () => {
    mocked.delete.mockResolvedValueOnce({ message: "Deleted" } as never);

    await deleteLinkBuildingOrder("uuid-99");

    expect(mocked.delete).toHaveBeenCalledWith(
      "/api/admin/link-building-orders/uuid-99"
    );
  });
});

// ─── batchUpdateLinkBuildingOrders ────────────────────────────────────────────

describe("batchUpdateLinkBuildingOrders", () => {
  it("POSTs row_ids and updates to the batch-update endpoint", async () => {
    mocked.post.mockResolvedValueOnce({ message: "Done", updated_count: 2 } as never);

    await batchUpdateLinkBuildingOrders(["a", "b"], { status: "Live" });

    const [url, body] = mocked.post.mock.calls[0];
    expect(url).toBe("/api/admin/link-building-orders/batch-update");
    expect(body).toEqual({ row_ids: ["a", "b"], updates: { status: "Live" } });
  });
});

// ─── buildLboPayload ─────────────────────────────────────────────────────────

describe("buildLboPayload", () => {
  it("strips server-only computed fields from the payload", () => {
    const row = makeRow({
      admin_team_name:            "Team Alpha",
      admin_team_color:           "#ff0000",
      assigned_admin_user_name:   "Jane Admin",
      assigned_admin_user_avatar: "https://cdn/avatar.jpg",
      created_at:                 "2026-01-01T00:00:00Z",
      updated_at:                 "2026-06-01T00:00:00Z",
    });

    const payload = buildLboPayload(row);

    expect(payload).not.toHaveProperty("id");
    expect(payload).not.toHaveProperty("admin_team_name");
    expect(payload).not.toHaveProperty("admin_team_color");
    expect(payload).not.toHaveProperty("assigned_admin_user_name");
    expect(payload).not.toHaveProperty("assigned_admin_user_avatar");
    expect(payload).not.toHaveProperty("created_at");
    expect(payload).not.toHaveProperty("updated_at");
  });

  it("preserves all editable client-facing fields", () => {
    const row = makeRow({ keyword: "local seo", client: "Acme Corp", user_id: 7 });

    const payload = buildLboPayload(row);

    expect(payload).toMatchObject({
      keyword:  "local seo",
      client:   "Acme Corp",
      user_id:  7,
    });
  });

  it("normalizes URL fields to include https:// prefix", () => {
    const row = makeRow({
      landing_page: "acme.com/page",
      partnership:  "partner.com",
      live_link:    "",
    });

    const payload = buildLboPayload(row);

    expect(payload.landing_page).toBe("https://acme.com/page");
    expect(payload.partnership).toBe("https://partner.com");
    expect(payload.live_link).toBe("");
  });

  it("does not duplicate the https:// prefix if already present", () => {
    const row = makeRow({ landing_page: "https://acme.com" });

    const payload = buildLboPayload(row);

    expect(payload.landing_page).toBe("https://acme.com");
  });

  it("converts empty admin_team_id string to null", () => {
    const row = makeRow({ admin_team_id: "" });

    const payload = buildLboPayload(row);

    expect(payload.admin_team_id).toBeNull();
  });
});

// ─── getMissingLboFields ──────────────────────────────────────────────────────

describe("getMissingLboFields", () => {
  it("returns empty array when all required fields are present", () => {
    const payload = buildLboPayload(makeRow());

    expect(getMissingLboFields(payload)).toHaveLength(0);
  });

  it("reports missing link_type, client, keyword, and landing_page", () => {
    const missing = getMissingLboFields({
      link_type:    "",
      client:       "",
      keyword:      "",
      landing_page: "",
    });

    expect(missing).toEqual(
      expect.arrayContaining(["link_type", "client", "keyword", "landing_page"])
    );
  });

  it("reports only the field that is blank", () => {
    const missing = getMissingLboFields(
      buildLboPayload(makeRow({ keyword: "   " }))
    );

    expect(missing).toEqual(["keyword"]);
  });
});

// ─── parseApiErrorMessage ─────────────────────────────────────────────────────

describe("parseApiErrorMessage", () => {
  it("formats Laravel field validation errors into a readable string", () => {
    const err = {
      message: "The given data was invalid.",
      errors: {
        keyword:      ["The keyword field is required."],
        landing_page: ["The landing page must be a valid URL."],
      },
    };

    const msg = parseApiErrorMessage(err, { keyword: "Keyword", landing_page: "Landing Page" });

    expect(msg).toContain("Keyword");
    expect(msg).toContain("Landing Page");
    expect(msg).toContain("required");
  });

  it("falls back to the top-level message when no field errors are present", () => {
    const err = { message: "Unauthorized." };

    expect(parseApiErrorMessage(err)).toBe("Unauthorized.");
  });

  it("returns a generic fallback for unknown error shapes", () => {
    expect(parseApiErrorMessage(null)).toContain("unexpected error");
    expect(parseApiErrorMessage("bad input")).toContain("unexpected error");
  });
});
