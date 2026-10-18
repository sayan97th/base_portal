/**
 * Unit tests for the shared date helpers.
 *
 * `toDateInputValue` is the core of the invoice-edit fix: the API serializes
 * `date_due` as an ISO 8601 string, but the invoice form endpoints validate
 * against the `Y-m-d` format. These tests lock in that normalization and,
 * critically, guard against the timezone-induced day shift that broke saving.
 */

import { toDateInputValue } from "@/lib/date";

describe("toDateInputValue", () => {
  describe("empty / invalid input", () => {
    it("returns an empty string for null", () => {
      expect(toDateInputValue(null)).toBe("");
    });

    it("returns an empty string for undefined", () => {
      expect(toDateInputValue(undefined)).toBe("");
    });

    it("returns an empty string for an empty string", () => {
      expect(toDateInputValue("")).toBe("");
    });

    it("returns an empty string for whitespace only", () => {
      expect(toDateInputValue("   ")).toBe("");
    });

    it("returns an empty string for an unparseable value", () => {
      expect(toDateInputValue("not-a-date")).toBe("");
    });
  });

  describe("already in YYYY-MM-DD form", () => {
    it("passes a plain date through unchanged", () => {
      expect(toDateInputValue("2026-07-24")).toBe("2026-07-24");
    });

    it("trims surrounding whitespace", () => {
      expect(toDateInputValue("  2026-07-24  ")).toBe("2026-07-24");
    });
  });

  describe("ISO 8601 strings (the bug scenario)", () => {
    it("extracts the date portion from a UTC ISO string with offset", () => {
      // This is exactly what the API returns via toIso8601String().
      expect(toDateInputValue("2026-07-24T00:00:00+00:00")).toBe("2026-07-24");
    });

    it("extracts the date portion from an ISO string ending in Z", () => {
      expect(toDateInputValue("2026-07-24T00:00:00Z")).toBe("2026-07-24");
    });

    it("does NOT shift the day regardless of the machine timezone", () => {
      // Parsing midnight UTC through `new Date()` in a negative-offset
      // timezone would roll back to the 23rd. Reading the literal date
      // portion must keep it on the 24th.
      expect(toDateInputValue("2026-07-24T00:00:00+00:00")).toBe("2026-07-24");
      expect(toDateInputValue("2026-01-01T00:00:00+00:00")).toBe("2026-01-01");
    });

    it("preserves the date part even when a non-midnight time is present", () => {
      expect(toDateInputValue("2026-12-31T23:59:59+00:00")).toBe("2026-12-31");
    });
  });

  describe("fallback parsing", () => {
    it("normalizes a human-readable date string", () => {
      // No `T`, so it goes through the Date constructor fallback.
      expect(toDateInputValue("July 24, 2026")).toBe("2026-07-24");
    });
  });
});
