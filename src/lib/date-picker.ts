/**
 * Calendar math for the date picker of the Link Building Orders table.
 *
 * Every helper works on local calendar days (no time of day), the same way the
 * table's date columns store their values as MM/DD/YYYY text.
 */

export const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Six weeks always fit any month, so the calendar keeps the same height every month. */
export const CALENDAR_DAY_COUNT = 42;

/** A month shown by the calendar, month is 0 based like Date#getMonth. */
export interface CalendarMonth {
  year: number;
  month: number;
}

export interface CalendarDay {
  date: Date;
  /** False for the leading and trailing days borrowed from the months around it. */
  is_in_month: boolean;
}

/** Builds a local date, or null when the parts do not form a real day (e.g. 02/30). */
function buildValidDate(year: number, month: number, day: number): Date | null {
  if (year < 1000 || year > 9999) return null;
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
  return date;
}

/**
 * Reads a date cell's text. Accepts MM/DD/YYYY (the table's format, with one or
 * two digit month and day, "/" or "-" separators) and YYYY-MM-DD. Anything else,
 * including blanks and formulas, returns null.
 */
export function parseCellDate(text: string): Date | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const us_match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (us_match) return buildValidDate(Number(us_match[3]), Number(us_match[1]) - 1, Number(us_match[2]));

  const iso_match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);
  if (iso_match) return buildValidDate(Number(iso_match[1]), Number(iso_match[2]) - 1, Number(iso_match[3]));

  return null;
}

export function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Today at midnight, local time. */
export function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Adds whole days, staying on local midnight across daylight saving changes. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function toCalendarMonth(date: Date): CalendarMonth {
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** Moves a calendar month forward (positive) or back (negative), rolling the year over. */
export function shiftCalendarMonth({ year, month }: CalendarMonth, months: number): CalendarMonth {
  const total = year * 12 + month + months;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/** Stable "YYYY-M" key, used to tell whether the shown month changed. */
export function toCalendarMonthKey({ year, month }: CalendarMonth): string {
  return `${year}-${month}`;
}

/**
 * The 42 days a month view shows, Sunday first: the tail of the month before,
 * the month itself and the start of the month after.
 */
export function buildCalendarDays({ year, month }: CalendarMonth): CalendarDay[] {
  const first_weekday = new Date(year, month, 1).getDay();
  return Array.from({ length: CALENDAR_DAY_COUNT }, (_, i) => {
    const date = new Date(year, month, 1 - first_weekday + i);
    return { date, is_in_month: date.getMonth() === month };
  });
}

/** The twelve years shown by the year view, a block that holds the given year. */
export function buildYearRange(year: number): number[] {
  const start = year - (((year % 12) + 12) % 12);
  return Array.from({ length: 12 }, (_, i) => start + i);
}

/** Long label for screen readers, e.g. "Sunday, October 25, 2026". */
export function formatAccessibleDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
