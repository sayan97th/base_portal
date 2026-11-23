/**
 * Tests for the SEO subscription formatting and billing calendar helpers
 * (src/components/admin/seo-packages-subscriptions/subscription-format.ts).
 *
 * The calendar math must match the API (SeoPackageSubscription::advanceByOneMonth),
 * otherwise the preview would promise charge dates the backend never uses.
 */

import {
  addBillingMonths,
  addCalendarDays,
  buildChargeSchedule,
  cardBrandLabel,
  clientName,
  dayOfMonth,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  initials,
  monthName,
  ordinal,
  todayIsoDate,
} from "@/components/admin/seo-packages-subscriptions/subscription-format";
import type { AdminSeoSubscription } from "@/services/admin/seo-packages-subscription.service";

describe("money formatting", () => {
  it("always shows cents in formatMoney", () => {
    expect(formatMoney(2000)).toBe("$2,000.00");
    expect(formatMoney(1499.5)).toBe("$1,499.50");
    expect(formatMoney(null)).toBe("$0.00");
  });

  it("drops cents for whole amounts in formatMoneyCompact", () => {
    expect(formatMoneyCompact(2000)).toBe("$2,000");
    expect(formatMoneyCompact(1499.5)).toBe("$1,499.50");
    expect(formatMoneyCompact(undefined)).toBe("$0");
  });
});

describe("date formatting", () => {
  it("never shifts a date only value to the previous day", () => {
    expect(formatDate("2026-12-01")).toBe("Dec 1, 2026");
    expect(formatDate("2027-01-01", { month: "long", year: "numeric" })).toBe("January 2027");
  });

  it("returns a readable placeholder for empty or invalid dates", () => {
    expect(formatDate(null)).toBe("Not set");
    expect(formatDate("")).toBe("Not set");
    expect(formatDate("not a date")).toBe("Not set");
  });

  it("names the month of a date", () => {
    expect(monthName("2026-11-25")).toBe("November");
    expect(monthName(null)).toBe("December");
  });

  it("builds today's ISO date from the local calendar", () => {
    jest.useFakeTimers({ now: new Date(2026, 10, 5, 23, 30) });
    expect(todayIsoDate()).toBe("2026-11-05");
    jest.useRealTimers();
  });

  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
    [25, "25th"],
    [31, "31st"],
  ])("writes %i as %s", (day, expected) => {
    expect(ordinal(day)).toBe(expected);
  });
});

describe("people and cards", () => {
  const subscription = {
    user: { id: 1, first_name: "Cathleen", last_name: "Siech", email: "cathleen@example.com" },
  } as AdminSeoSubscription;

  it("uses the full name, or the email when there is no name", () => {
    expect(clientName(subscription)).toBe("Cathleen Siech");
    expect(clientName({ ...subscription, user: { ...subscription.user, first_name: "", last_name: "" } })).toBe(
      "cathleen@example.com"
    );
  });

  it("builds initials from the first and last word", () => {
    expect(initials("Cathleen Ann Siech")).toBe("CS");
    expect(initials("abby")).toBe("AB");
  });

  it("labels card brands", () => {
    expect(cardBrandLabel("visa")).toBe("Visa");
    expect(cardBrandLabel("AMEX")).toBe("Amex");
    expect(cardBrandLabel("elo")).toBe("Elo");
    expect(cardBrandLabel(null)).toBe("Card");
  });
});

describe("billing calendar", () => {
  it.each([
    ["2026-12-01", 1, undefined, "2027-01-01"],
    ["2027-01-31", 1, undefined, "2027-02-28"],
    ["2028-01-31", 1, undefined, "2028-02-29"],
    ["2027-02-28", 1, 31, "2027-03-31"],
    ["2026-12-15", 12, undefined, "2027-12-15"],
    ["2026-12-15", -1, undefined, "2026-11-15"],
  ])("moves %s by %i month(s) with anchor %s to %s", (from, months, anchor, expected) => {
    expect(addBillingMonths(from, months, anchor)).toBe(expected);
  });

  it("adds calendar days across month and year ends", () => {
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addCalendarDays("2027-03-01", -1)).toBe("2027-02-28");
  });

  it("reads the day of the month", () => {
    expect(dayOfMonth("2026-11-25")).toBe(25);
    expect(dayOfMonth("bad")).toBe(1);
  });

  it("keeps the original anchor through short months", () => {
    expect(buildChargeSchedule("2027-01-31", 4)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
  });

  it("stops at the end date", () => {
    expect(buildChargeSchedule("2026-12-01", 12, "2027-02-15")).toEqual(["2026-12-01", "2027-01-01", "2027-02-01"]);
    expect(buildChargeSchedule("2026-12-01", 12, "2026-11-30")).toEqual([]);
  });
});
