/**
 * Older notification rows were written with a pluralized "/orders/sessions/{id}" path that
 * never matched the actual Next.js routes ("/orders/session/{id}" and
 * "/admin/orders/session/{id}", singular). The API now writes the correct singular path for
 * new notifications, but this normalizes any already-stored rows so they still navigate
 * correctly instead of 404ing.
 */
export function resolveNotificationLink(link: string | null | undefined): string | null {
  if (!link) return null;

  return link
    .replace("/orders/sessions/", "/orders/session/")
    .replace("/admin/orders/sessions/", "/admin/orders/session/");
}
