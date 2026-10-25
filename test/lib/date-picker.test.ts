import {
  addDays,
  buildCalendarDays,
  buildYearRange,
  isSameDay,
  parseCellDate,
  shiftCalendarMonth,
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

  it("lists a block of twelve years holding the given year", () => {
    const years = buildYearRange(2026);
    expect(years).toHaveLength(12);
    expect(years).toContain(2026);
    expect(years[0] % 12).toBe(0);
  });
});
