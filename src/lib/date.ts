/**
 * Date helpers shared across the portal.
 *
 * The Laravel API serializes date columns with `toIso8601String()`
 * (e.g. "2026-07-24T00:00:00+00:00"), while form endpoints validate
 * incoming dates against the `Y-m-d` format. These helpers bridge the
 * two representations safely, avoiding timezone shifts that would occur
 * if an ISO string were parsed through the local `Date` constructor.
 */

/**
 * Normalizes an arbitrary date string into the `YYYY-MM-DD` format
 * expected by the API. Returns an empty string when the input is
 * missing or cannot be parsed.
 */
export function toDateInputValue(raw: string | null | undefined): string {
  if (!raw) return "";

  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Already in YYYY-MM-DD form.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // ISO 8601 with a time component (e.g. "2026-07-24T00:00:00+00:00").
  // Take the date portion directly to avoid timezone-induced day shifts.
  const iso_match = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (iso_match) {
    return iso_match[1];
  }

  // Fallback: let the Date constructor parse it, then read local parts.
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
