/**
 * Unit tests for the admin invoice service.
 *
 * These verify the update/create calls target the correct endpoints and
 * forward the payload verbatim (the date normalization happens in the form
 * components, so the service must not mutate the body it is given).
 */

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
import {
  getAdminInvoice,
  updateAdminInvoice,
  createAdminInvoice,
  type UpdateInvoicePayload,
} from "@/services/admin/invoice.service";
import type { CreateInvoicePayload } from "@/types/admin";

const mocked = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getAdminInvoice", () => {
  it("requests the single-invoice endpoint by id", async () => {
    mocked.get.mockResolvedValueOnce({ id: "abc" } as never);

    await getAdminInvoice("abc");

    expect(mocked.get).toHaveBeenCalledWith("/api/admin/invoices/abc");
  });
});

describe("updateAdminInvoice", () => {
  it("PATCHes the invoice endpoint with the given id", async () => {
    mocked.patch.mockResolvedValueOnce({ id: "inv-1" } as never);

    await updateAdminInvoice("inv-1", { date_due: "2026-07-24" });

    expect(mocked.patch).toHaveBeenCalledWith(
      "/api/admin/invoices/inv-1",
      expect.objectContaining({ date_due: "2026-07-24" })
    );
  });

  it("forwards the full payload, including line items and discounts, unchanged", async () => {
    mocked.patch.mockResolvedValueOnce({ id: "inv-2" } as never);

    const payload: UpdateInvoicePayload = {
      user_id: 42,
      date_due: "2026-07-24",
      line_items: [
        {
          item_name: "Link Building Package",
          description: "10 links",
          price: 500,
          quantity: 1,
          discount_percent: 10,
        },
      ],
      notes: "Manual adjustment",
      send_update_notification: true,
    };

    await updateAdminInvoice("inv-2", payload);

    const [, sent_body] = mocked.patch.mock.calls[0];
    expect(sent_body).toEqual(payload);
  });
});

describe("createAdminInvoice", () => {
  it("POSTs to the invoices collection endpoint with the payload", async () => {
    mocked.post.mockResolvedValueOnce({ id: "new-inv" } as never);

    const payload: CreateInvoicePayload = {
      user_id: 7,
      date_due: "2026-07-24",
      line_items: [
        { item_name: "Service", price: 100, quantity: 1 },
      ],
      send_client_notification: false,
      send_admin_notification: false,
    };

    await createAdminInvoice(payload);

    expect(mocked.post).toHaveBeenCalledWith("/api/admin/invoices", payload);
  });
});
