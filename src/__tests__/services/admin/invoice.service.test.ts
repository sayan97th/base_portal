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
  refundAdminInvoice,
  partialRefundAdminInvoice,
  setInvoicePaymentIntent,
  type UpdateInvoicePayload,
  type RefundOptions,
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

describe("refundAdminInvoice", () => {
  it("POSTs to the refund endpoint for the given invoice id", async () => {
    mocked.post.mockResolvedValueOnce({ id: "inv-1", status: "refund" } as never);

    await refundAdminInvoice("inv-1");

    expect(mocked.post).toHaveBeenCalledWith(
      "/api/admin/invoices/inv-1/refund",
      expect.objectContaining({ confirmation: true })
    );
  });

  it("includes send_client_notification=true by default", async () => {
    mocked.post.mockResolvedValueOnce({ id: "inv-1" } as never);

    await refundAdminInvoice("inv-1");

    const [, body] = mocked.post.mock.calls[0];
    expect(body).toMatchObject({ send_client_notification: true });
  });

  it("forwards send_client_notification=false when explicitly set", async () => {
    mocked.post.mockResolvedValueOnce({ id: "inv-1" } as never);

    const options: RefundOptions = { send_client_notification: false };
    await refundAdminInvoice("inv-1", options);

    const [, body] = mocked.post.mock.calls[0];
    expect(body).toMatchObject({ send_client_notification: false });
  });

  it("forwards payment_intent_id when provided", async () => {
    mocked.post.mockResolvedValueOnce({ id: "inv-1" } as never);

    await refundAdminInvoice("inv-1", { payment_intent_id: "pi_test_abc" });

    const [, body] = mocked.post.mock.calls[0];
    expect(body).toMatchObject({ payment_intent_id: "pi_test_abc" });
  });

  it("omits payment_intent_id when not provided", async () => {
    mocked.post.mockResolvedValueOnce({ id: "inv-1" } as never);

    await refundAdminInvoice("inv-1");

    const [, body] = mocked.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(body).not.toHaveProperty("payment_intent_id");
  });

  it("returns the updated invoice returned by the API", async () => {
    const expected = { id: "inv-1", status: "refund" };
    mocked.post.mockResolvedValueOnce(expected as never);

    const result = await refundAdminInvoice("inv-1");

    expect(result).toEqual(expected);
  });
});

describe("partialRefundAdminInvoice", () => {
  it("POSTs to the partial-refund endpoint for the given invoice id", async () => {
    mocked.post.mockResolvedValueOnce({ id: "inv-2", status: "partial_refund" } as never);

    await partialRefundAdminInvoice("inv-2", 150);

    expect(mocked.post).toHaveBeenCalledWith(
      "/api/admin/invoices/inv-2/partial-refund",
      expect.objectContaining({ refund_amount: 150, confirmation: true })
    );
  });

  it("includes send_client_notification=true by default", async () => {
    mocked.post.mockResolvedValueOnce({ id: "inv-2" } as never);

    await partialRefundAdminInvoice("inv-2", 100);

    const [, body] = mocked.post.mock.calls[0];
    expect(body).toMatchObject({ send_client_notification: true });
  });

  it("forwards send_client_notification=false when set to false", async () => {
    mocked.post.mockResolvedValueOnce({ id: "inv-2" } as never);

    await partialRefundAdminInvoice("inv-2", 100, { send_client_notification: false });

    const [, body] = mocked.post.mock.calls[0];
    expect(body).toMatchObject({ send_client_notification: false });
  });

  it("forwards payment_intent_id when provided", async () => {
    mocked.post.mockResolvedValueOnce({ id: "inv-2" } as never);

    await partialRefundAdminInvoice("inv-2", 200, { payment_intent_id: "pi_xyz" });

    const [, body] = mocked.post.mock.calls[0];
    expect(body).toMatchObject({ payment_intent_id: "pi_xyz" });
  });

  it("omits payment_intent_id when not provided", async () => {
    mocked.post.mockResolvedValueOnce({ id: "inv-2" } as never);

    await partialRefundAdminInvoice("inv-2", 200);

    const [, body] = mocked.post.mock.calls[0] as [string, Record<string, unknown>];
    expect(body).not.toHaveProperty("payment_intent_id");
  });

  it("sends the exact refund_amount unchanged", async () => {
    mocked.post.mockResolvedValueOnce({ id: "inv-2" } as never);

    await partialRefundAdminInvoice("inv-2", 49.99);

    const [, body] = mocked.post.mock.calls[0];
    expect(body).toMatchObject({ refund_amount: 49.99 });
  });

  it("returns the updated invoice returned by the API", async () => {
    const expected = { id: "inv-2", status: "partial_refund", refund_amount: 150 };
    mocked.post.mockResolvedValueOnce(expected as never);

    const result = await partialRefundAdminInvoice("inv-2", 150);

    expect(result).toEqual(expected);
  });
});

describe("setInvoicePaymentIntent", () => {
  it("PATCHes the payment-intent endpoint with the given id", async () => {
    mocked.patch.mockResolvedValueOnce({ id: "inv-3" } as never);

    await setInvoicePaymentIntent("inv-3", "pi_new_abc");

    expect(mocked.patch).toHaveBeenCalledWith(
      "/api/admin/invoices/inv-3/payment-intent",
      { payment_intent_id: "pi_new_abc" }
    );
  });
});
