import { isSafeInternalPath, getSafeRedirectPath } from "@/lib/safe-redirect";

describe("isSafeInternalPath", () => {
  it("accepts a plain relative path", () => {
    expect(isSafeInternalPath("/invoices/abc-123")).toBe(true);
  });

  it("accepts a relative path with a query string and fragment", () => {
    expect(isSafeInternalPath("/orders/abc123?comment_id=5#comment-5")).toBe(true);
  });

  it("rejects a missing path", () => {
    expect(isSafeInternalPath(null)).toBe(false);
    expect(isSafeInternalPath(undefined)).toBe(false);
    expect(isSafeInternalPath("")).toBe(false);
  });

  it("rejects a protocol-relative path (classic open-redirect vector)", () => {
    expect(isSafeInternalPath("//evil-external-host.example/phishing")).toBe(false);
  });

  it("rejects an absolute URL with a scheme", () => {
    expect(isSafeInternalPath("https://evil-external-host.example/phishing")).toBe(false);
  });

  it("rejects a path missing the leading slash", () => {
    expect(isSafeInternalPath("invoices/abc-123")).toBe(false);
  });

  it("rejects a path containing a backslash", () => {
    expect(isSafeInternalPath("/\\evil-external-host.example")).toBe(false);
  });

  it("rejects a path containing control characters", () => {
    expect(isSafeInternalPath("/invoices/abc\r\nSet-Cookie: x=1")).toBe(false);
  });

  it("rejects a path exceeding the maximum length", () => {
    expect(isSafeInternalPath("/" + "a".repeat(3000))).toBe(false);
  });
});

describe("getSafeRedirectPath", () => {
  it("returns the normalized path when it is safe", () => {
    expect(getSafeRedirectPath("/invoices/abc-123")).toBe("/invoices/abc-123");
  });

  it("normalizes legacy notification link shapes before validating", () => {
    expect(getSafeRedirectPath("/orders/sessions/sess-1")).toBe("/orders/session/sess-1");
  });

  it("falls back to the default path when the link is unsafe", () => {
    expect(getSafeRedirectPath("//evil-external-host.example")).toBe("/");
  });

  it("falls back to a custom fallback when provided", () => {
    expect(getSafeRedirectPath(null, "/admin/dashboard")).toBe("/admin/dashboard");
  });

  it("falls back to the default path when the link is missing", () => {
    expect(getSafeRedirectPath(undefined)).toBe("/");
  });
});
