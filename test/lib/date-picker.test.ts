/**
 * Calendar math behind the date picker of the Link Building Orders table.
 */

import {
  addDays,
  buildCalendarDays,
  buildYearRange,
  formatAccessibleDate,
  getToday,
  isSameDay,
  parseCellDate,
  shiftCalendarMonth,
  toCalendarMonth,
  toCalendarMonthKey,
} from "@/lib/date-picker";

describe("parseCellDate", () => {
  it("reads the table's MM/DD/YYYY format, with or without leading zeros", () => {
    expect(isSameDay(parseCellDate("10/25/2026"), new Date(2026, 9, 25))).toBe(true);
    expect(isSameDay(parseCellDate("3/7/2026"), new Date(2026, 2, 7))).toBe(true);
    expect(isSameDay(parseCellDate(" 03-07-2026 "), new Date(2026, 2, 7))).toBe(true);
  });

  it("reads YYYY-MM-DD and ISO timestamps without shifting the day", () => {
    expect(isSameDay(parseCellDate("2026-07-24"), new Date(2026, 6, 24))).toBe(true);
    expect(isSameDay(parseCellDate("2026-07-24T00:00:00+00:00"), new Date(2026, 6, 24))).toBe(true);
  });

  it("returns null for blanks, formulas, partial text and days that do not exist", () => {
    expect(parseCellDate("")).toBeNull();
    expect(parseCellDate("=TODAY()")).toBeNull();
    expect(parseCellDate("10/25")).toBeNull();
    expect(parseCellDate("02/30/2026")).toBeNull();
    expect(parseCellDate("13/01/2026")).toBeNull();
    expect(parseCellDate("02/29/2026")).toBeNull();
    expect(parseCellDate("10/25/26")).toBeNull();
    expect(parseCellDate("Oct 25, 2026")).toBeNull();
  });

  it("accepts February 29 on a leap year", () => {
    expect(isSameDay(parseCellDate("02/29/2028"), new Date(2028, 1, 29))).toBe(true);
  });
});

describe("calendar helpers", () => {
  it("builds six Sunday first weeks around the month", () => {
    const days = buildCalendarDays({ year: 2026, month: 9 });
    expect(days).toHaveLength(42);
    // October 1, 2026 is a Thursday, so the grid opens on Sunday, September 27.
    expect(isSameDay(days[0].date, new Date(2026, 8, 27))).toBe(true);
    expect(days[0].is_in_month).toBe(false);
    expect(isSameDay(days[4].date, new Date(2026, 9, 1))).toBe(true);
    expect(days.filter((d) => d.is_in_month)).toHaveLength(31);
  });

  it("rolls the year over when shifting months", () => {
    expect(shiftCalendarMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftCalendarMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftCalendarMonth({ year: 2026, month: 9 }, -144)).toEqual({ year: 2014, month: 9 });
  });

  it("adds days across month ends", () => {
    expect(isSameDay(addDays(new Date(2026, 9, 25), 7), new Date(2026, 10, 1))).toBe(true);
  });

  it("lists twelve years around the given year, leaning toward the future", () => {
    expect(buildYearRange(2026)).toEqual([2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033]);
  });
});

describe("small date helpers", () => {
  afterEach(() => jest.useRealTimers());

  it("getToday drops the time of day", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 25, 23, 59, 30));
    const today = getToday();
    expect(today.getHours()).toBe(0);
    expect(today.getMinutes()).toBe(0);
    expect(isSameDay(today, new Date(2026, 9, 25))).toBe(true);
  });

  it("isSameDay ignores the time and treats a missing date as different", () => {
    expect(isSameDay(new Date(2026, 9, 25, 8), new Date(2026, 9, 25, 22))).toBe(true);
    expect(isSameDay(new Date(2026, 9, 25), null)).toBe(false);
    expect(isSameDay(null, null)).toBe(false);
  });

  it("addDays goes back with a negative count", () => {
    expect(isSameDay(addDays(new Date(2026, 0, 1), -1), new Date(2025, 11, 31))).toBe(true);
  });

  it("month keys tell months apart, also across years", () => {
    expect(toCalendarMonth(new Date(2026, 9, 25))).toEqual({ year: 2026, month: 9 });
    expect(toCalendarMonthKey({ year: 2026, month: 9 })).toBe("2026-9");
    expect(toCalendarMonthKey({ year: 2026, month: 1 })).not.toBe(toCalendarMonthKey({ year: 2027, month: 1 }));
  });

  it("spells a date out for screen readers", () => {
    expect(formatAccessibleDate(new Date(2026, 9, 25))).toBe("Sunday, October 25, 2026");
  });

  it("a month starting on Sunday opens the grid on its first day", () => {
    // November 1, 2026 is a Sunday.
    const days = buildCalendarDays({ year: 2026, month: 10 });
    expect(isSameDay(days[0].date, new Date(2026, 10, 1))).toBe(true);
    expect(days[0].is_in_month).toBe(true);
  });
});
