import { resolveNotificationLink } from "@/lib/notification-link";

describe("resolveNotificationLink", () => {
  it("returns null for a null link", () => {
    expect(resolveNotificationLink(null)).toBeNull();
  });

  it("returns null for an undefined link", () => {
    expect(resolveNotificationLink(undefined)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(resolveNotificationLink("")).toBeNull();
  });

  it("passes through an already-correct client order link unchanged", () => {
    expect(resolveNotificationLink("/orders/abc123?comment_id=5#comment-5")).toBe(
      "/orders/abc123?comment_id=5#comment-5"
    );
  });

  it("passes through an already-correct admin order link unchanged", () => {
    expect(resolveNotificationLink("/admin/orders/abc123?comment_id=5#comment-5")).toBe(
      "/admin/orders/abc123?comment_id=5#comment-5"
    );
  });

  it("normalizes the legacy plural client session route to the singular route", () => {
    expect(resolveNotificationLink("/orders/sessions/sess-1?comment_id=9#comment-9")).toBe(
      "/orders/session/sess-1?comment_id=9#comment-9"
    );
  });

  it("normalizes the legacy plural admin session route to the singular route", () => {
    expect(resolveNotificationLink("/admin/orders/sessions/sess-1?comment_id=9#comment-9")).toBe(
      "/admin/orders/session/sess-1?comment_id=9#comment-9"
    );
  });

  it("passes through an already-correct singular session route unchanged", () => {
    expect(resolveNotificationLink("/orders/session/sess-1")).toBe("/orders/session/sess-1");
  });
});
