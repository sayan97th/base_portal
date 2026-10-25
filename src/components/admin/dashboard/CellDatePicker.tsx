"use client";

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatDateMMDDYYYY } from "@/lib/spreadsheet-navigation";
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
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
  type CalendarMonth,
} from "@/lib/date-picker";
import styles from "./CellDatePicker.module.scss";

type CalendarView = "days" | "months" | "years";

interface QuickPick {
  label: string;
  days: number;
}

/** Shortcuts counted from today, the usual follow up and delivery windows. */
const QUICK_PICKS: QuickPick[] = [
  { label: "Tomorrow", days: 1 },
  { label: "+7 days", days: 7 },
  { label: "+14 days", days: 14 },
  { label: "+30 days", days: 30 },
];

const PANEL_WIDTH = 288;
const PANEL_GAP = 4;
const VIEWPORT_MARGIN = 8;

interface CellDatePickerProps {
  /** The cell's text while it is edited, the calendar follows it as the admin types. */
  value: string;
  /** Cell element the panel is positioned against. */
  anchor_el: HTMLElement | null;
  /** Commits a picked date (MM/DD/YYYY), or "" when the date is cleared. */
  onSelect: (value: string) => void;
}

/** Keeps the cell's input focused, a click inside the panel would otherwise blur it and end the edit. */
const keepInputFocus = (e: React.MouseEvent) => e.preventDefault();

/**
 * Calendar popover shown under a date cell while it is edited, similar to
 * monday.com's date column. The cell's own input stays the text field (typing,
 * pasting, formulas and Ctrl+; keep working), the panel adds a month grid,
 * month and year pickers, a Today button, Clear and quick picks. Nothing in it
 * takes focus, so a click picks a value without ending the edit first.
 */
export default function CellDatePicker({ value, anchor_el, onSelect }: CellDatePickerProps) {
  const panel_ref = useRef<HTMLDivElement>(null);

  const selected_date = useMemo(() => parseCellDate(value), [value]);
  const today = useMemo(() => getToday(), []);

  const [view, setView] = useState<CalendarView>("days");
  const [shown_month, setShownMonth] = useState<CalendarMonth>(() => toCalendarMonth(selected_date ?? today));

  // A date typed into the cell moves the calendar to its month. Adjusted during
  // render, React's pattern for "reset state when a prop changes".
  const selected_month_key = selected_date ? toCalendarMonthKey(toCalendarMonth(selected_date)) : null;
  const [synced_month_key, setSyncedMonthKey] = useState(selected_month_key);
  if (synced_month_key !== selected_month_key) {
    setSyncedMonthKey(selected_month_key);
    if (selected_date) {
      setShownMonth(toCalendarMonth(selected_date));
      setView("days");
    }
  }

  const calendar_days = useMemo(() => buildCalendarDays(shown_month), [shown_month]);
  const year_range = useMemo(() => buildYearRange(shown_month.year), [shown_month.year]);

  // Written straight to the panel's style, so following a scroll does not re-render it.
  const updatePosition = useCallback(() => {
    const panel_el = panel_ref.current;
    if (!anchor_el || !panel_el) return;
    const anchor_rect = anchor_el.getBoundingClientRect();
    const panel_h = panel_el.offsetHeight;
    const viewport_w = document.documentElement.clientWidth;

    const space_below = window.innerHeight - anchor_rect.bottom - PANEL_GAP - VIEWPORT_MARGIN;
    const opens_above = space_below < panel_h && anchor_rect.top > space_below;
    let top = opens_above ? anchor_rect.top - panel_h - PANEL_GAP : anchor_rect.bottom + PANEL_GAP;
    top = Math.max(VIEWPORT_MARGIN, top);

    const max_left = viewport_w - PANEL_WIDTH - VIEWPORT_MARGIN;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(anchor_rect.left, max_left));

    panel_el.style.top = `${top}px`;
    panel_el.style.left = `${left}px`;
    panel_el.style.visibility = "visible";
  }, [anchor_el]);

  // Follows the cell while the table or the page scrolls, and when the panel changes height.
  useLayoutEffect(() => {
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [updatePosition, view]);

  if (typeof document === "undefined" || !anchor_el) return null;

  const pickDate = (date: Date) => onSelect(formatDateMMDDYYYY(date));

  const renderDaysView = () => (
    <div role="grid" aria-label={`${MONTH_LABELS[shown_month.month]} ${shown_month.year}`} className={styles.day_grid}>
      <div role="row" className={styles.weekday_row}>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} role="columnheader" className={styles.weekday}>
            {label}
          </span>
        ))}
      </div>
      {Array.from({ length: calendar_days.length / 7 }, (_, week_idx) => (
        <div key={week_idx} role="row" className={styles.week_row}>
          {calendar_days.slice(week_idx * 7, week_idx * 7 + 7).map(({ date, is_in_month }) => {
            const is_selected = isSameDay(date, selected_date);
            const is_today = isSameDay(date, today);
            return (
              <button
                key={date.getTime()}
                type="button"
                role="gridcell"
                tabIndex={-1}
                aria-selected={is_selected}
                aria-current={is_today ? "date" : undefined}
                aria-label={formatAccessibleDate(date)}
                onMouseDown={keepInputFocus}
                onClick={() => pickDate(date)}
                className={`${styles.day}${is_in_month ? "" : ` ${styles.day_outside}`}${
                  is_today ? ` ${styles.day_today}` : ""
                }${is_selected ? ` ${styles.day_selected}` : ""}`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  const renderMonthsView = () => (
    <div className={styles.option_grid}>
      {MONTH_LABELS.map((label, month_idx) => {
        const is_current = month_idx === shown_month.month;
        return (
          <button
            key={label}
            type="button"
            tabIndex={-1}
            aria-pressed={is_current}
            onMouseDown={keepInputFocus}
            onClick={() => {
              setShownMonth((prev) => ({ ...prev, month: month_idx }));
              setView("days");
            }}
            className={`${styles.option}${is_current ? ` ${styles.option_selected}` : ""}`}
          >
            {label.slice(0, 3)}
          </button>
        );
      })}
    </div>
  );

  const renderYearsView = () => (
    <div className={styles.option_grid}>
      {year_range.map((year) => {
        const is_current = year === shown_month.year;
        return (
          <button
            key={year}
            type="button"
            tabIndex={-1}
            aria-pressed={is_current}
            onMouseDown={keepInputFocus}
            onClick={() => {
              setShownMonth((prev) => ({ ...prev, year }));
              setView("days");
            }}
            className={`${styles.option}${is_current ? ` ${styles.option_selected}` : ""}${
              year === today.getFullYear() ? ` ${styles.option_today}` : ""
            }`}
          >
            {year}
          </button>
        );
      })}
    </div>
  );

  // The arrows step a month in the days and months views, and twelve years in the years view.
  const nav_step = view === "years" ? 144 : view === "months" ? 12 : 1;
  const nav_noun = view === "days" ? "month" : view === "months" ? "year" : "years";

  const content = (
    <div
      ref={panel_ref}
      role="dialog"
      aria-label="Choose a date"
      className={styles.panel}
      // Hidden until the first measure, so it never flashes at the corner of the screen.
      style={{ top: 0, left: 0, width: PANEL_WIDTH, visibility: "hidden" }}
      onMouseDown={keepInputFocus}
    >
      <div className={styles.header}>
        <button type="button" tabIndex={-1} onMouseDown={keepInputFocus} onClick={() => pickDate(today)} className={styles.today_button}>
          Today
        </button>
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={keepInputFocus}
          onClick={() => onSelect("")}
          disabled={value.trim() === ""}
          className={styles.icon_button}
          title="Clear date"
          aria-label="Clear date"
        >
          <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0l-.8 11.2A2 2 0 0114.2 20H9.8a2 2 0 01-2-1.8L7 7" />
          </svg>
        </button>
      </div>

      <div className={styles.selected_summary} aria-live="polite">
        {selected_date ? (
          <>
            <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className={styles.selected_text}>{formatAccessibleDate(selected_date)}</span>
          </>
        ) : (
          <span className={styles.selected_placeholder}>
            {value.trim() ? "Not a date yet, type MM/DD/YYYY or pick a day" : "No date set, pick a day below"}
          </span>
        )}
      </div>

      <div className={styles.nav}>
        <div className={styles.nav_labels}>
          <button
            type="button"
            tabIndex={-1}
            aria-expanded={view === "months"}
            onMouseDown={keepInputFocus}
            onClick={() => setView((prev) => (prev === "months" ? "days" : "months"))}
            className={`${styles.nav_label}${view === "months" ? ` ${styles.nav_label_open}` : ""}`}
          >
            {MONTH_LABELS[shown_month.month].slice(0, 3)}
            <svg className={styles.chevron} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-expanded={view === "years"}
            onMouseDown={keepInputFocus}
            onClick={() => setView((prev) => (prev === "years" ? "days" : "years"))}
            className={`${styles.nav_label}${view === "years" ? ` ${styles.nav_label_open}` : ""}`}
          >
            {shown_month.year}
            <svg className={styles.chevron} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <div className={styles.nav_arrows}>
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={keepInputFocus}
            onClick={() => setShownMonth((prev) => shiftCalendarMonth(prev, -nav_step))}
            className={styles.icon_button}
            aria-label={`Previous ${nav_noun}`}
          >
            <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={keepInputFocus}
            onClick={() => setShownMonth((prev) => shiftCalendarMonth(prev, nav_step))}
            className={styles.icon_button}
            aria-label={`Next ${nav_noun}`}
          >
            <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {view === "days" && renderDaysView()}
      {view === "months" && renderMonthsView()}
      {view === "years" && renderYearsView()}

      <div className={styles.footer}>
        <span className={styles.footer_label}>
          <svg className={styles.sparkle} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zM19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z" />
          </svg>
          Quick pick
        </span>
        <div className={styles.quick_picks}>
          {QUICK_PICKS.map(({ label, days }) => {
            const date = addDays(today, days);
            return (
              <button
                key={label}
                type="button"
                tabIndex={-1}
                onMouseDown={keepInputFocus}
                onClick={() => pickDate(date)}
                className={`${styles.quick_pick}${isSameDay(date, selected_date) ? ` ${styles.quick_pick_selected}` : ""}`}
                title={formatDateMMDDYYYY(date)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
