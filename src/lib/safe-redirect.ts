import { resolveNotificationLink } from "@/lib/notification-link";

const MAX_PATH_LENGTH = 2048;

/**
 * Allows path, query string, and fragment characters produced by our own router.
 * Deliberately excludes backslashes and a second leading slash, the building
 * blocks of a protocol-relative open redirect (e.g. "//evil.com").
 */
const SAFE_PATH_PATTERN = /^\/[A-Za-z0-9\-_.~/?=&%#]*$/;

/**
 * Returns true when `path` is safe to hand to `router.push()` / `window.location`
 * as an internal, same-origin navigation target. Mirrors the backend's
 * NotificationLinkValidator so a link is judged by the same rule on both ends of
 * the request. Never trust a `link` value (from a notification, a query param, or
 * anywhere else user/data-controlled) for navigation without passing it through
 * this check first, it is what stands between a stored/forwarded path and an open
 * redirect.
 */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (path.length > MAX_PATH_LENGTH) return false;
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (/[\x00-\x1f\x7f\\]/.test(path)) return false;
  return SAFE_PATH_PATTERN.test(path);
}

/**
 * Normalizes a notification link (see resolveNotificationLink) and validates it,
 * returning `fallback` when the link is missing or unsafe. Use this instead of
 * navigating directly to a stored/forwarded path.
 */
export function getSafeRedirectPath(
  link: string | null | undefined,
  fallback: string = "/"
): string {
  const normalized = resolveNotificationLink(link);
  return isSafeInternalPath(normalized) ? normalized : fallback;
}
