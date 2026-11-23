"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  addDays,
  buildCalendarDays,
  formatAccessibleDate,
  getToday,
  isSameDay,
  shiftCalendarMonth,
  toCalendarMonth,
  type CalendarMonth,
} from "@/lib/date-picker";
import styles from "./DateField.module.scss";

/**
 * Compact calendar date field. Values are "YYYY-MM-DD" strings (or "" when
 * empty), the same format as a native date input, so it is a drop in
 * replacement that opens a small, polished calendar instead of the browser's.
 */
export interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Shows a Clear action and an x button when a value is set. */
  clearable?: boolean;
  id?: string;
  /** Accessible name when there is no visible label pointing at `id`. */
  aria_label?: string;
  /** Days that get a small dot, e.g. upcoming charge dates. */
  marked_dates?: string[];
  /** Short text under the calendar, e.g. "Billed on this day every month". */
  footer_hint?: string;
  has_error?: boolean;
}

const POPOVER_WIDTH = 296;
const POPOVER_HEIGHT = 360;
const VIEWPORT_GAP = 12;

const SHORT_MONTH_LABELS = MONTH_LABELS.map((label) => label.slice(0, 3));

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export default function DateField({
  value,
  onChange,
  min,
  max,
  placeholder = "Select a date",
  disabled = false,
  clearable = false,
  id,
  aria_label,
  marked_dates = [],
  footer_hint,
  has_error = false,
}: DateFieldProps) {
  const generated_id = useId();
  const field_id = id ?? `date-field-${generated_id}`;
  const popover_id = `${field_id}-calendar`;

  const selected = useMemo(() => parseIsoDate(value), [value]);
  const min_date = useMemo(() => parseIsoDate(min), [min]);
  const max_date = useMemo(() => parseIsoDate(max), [max]);
  const marked = useMemo(() => new Set(marked_dates), [marked_dates]);

  const [is_open, setIsOpen] = useState(false);
  const [view, setView] = useState<"days" | "months">("days");
  const [shown_month, setShownMonth] = useState<CalendarMonth>(() => toCalendarMonth(selected ?? getToday()));
  const [focused_date, setFocusedDate] = useState<Date>(() => selected ?? getToday());
  const [placement, setPlacement] = useState<{ vertical: "below" | "above"; align: "left" | "right" }>({
    vertical: "below",
    align: "left",
  });

  const root_ref = useRef<HTMLDivElement>(null);
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const grid_ref = useRef<HTMLDivElement>(null);

  const isDisabledDay = useCallback(
    (date: Date) => (min_date !== null && date < min_date) || (max_date !== null && date > max_date),
    [min_date, max_date]
  );

  const clampToRange = useCallback(
    (date: Date) => {
      if (min_date && date < min_date) return min_date;
      if (max_date && date > max_date) return max_date;
      return date;
    },
    [min_date, max_date]
  );

  function openCalendar() {
    if (disabled) return;
    const start = clampToRange(selected ?? getToday());
    setShownMonth(toCalendarMonth(start));
    setFocusedDate(start);
    setView("days");

    const rect = trigger_ref.current?.getBoundingClientRect();
    if (rect) {
      const space_below = window.innerHeight - rect.bottom;
      const space_above = rect.top;
      setPlacement({
        vertical: space_below < POPOVER_HEIGHT && space_above > space_below ? "above" : "below",
        align: rect.left + POPOVER_WIDTH > window.innerWidth - VIEWPORT_GAP ? "right" : "left",
      });
    }
    setIsOpen(true);
  }

  const closeCalendar = useCallback((restore_focus = true) => {
    setIsOpen(false);
    if (restore_focus) trigger_ref.current?.focus();
  }, []);

  function selectDate(date: Date) {
    if (isDisabledDay(date)) return;
    onChange(toIsoDate(date));
    closeCalendar();
  }

  // Close on outside click.
  useEffect(() => {
    if (!is_open) return;
    function handlePointerDown(e: MouseEvent) {
      if (root_ref.current && !root_ref.current.contains(e.target as Node)) closeCalendar(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [is_open, closeCalendar]);

  // Keep keyboard focus on the focused day while navigating.
  useEffect(() => {
    if (!is_open || view !== "days") return;
    const button = grid_ref.current?.querySelector<HTMLButtonElement>(`[data-date="${toIsoDate(focused_date)}"]`);
    button?.focus({ preventScroll: true });
  }, [is_open, view, focused_date, shown_month]);

  function moveFocus(next: Date) {
    setFocusedDate(next);
    if (next.getMonth() !== shown_month.month || next.getFullYear() !== shown_month.year) {
      setShownMonth(toCalendarMonth(next));
    }
  }

  function handleGridKeyDown(e: React.KeyboardEvent) {
    const key_moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused_date, -1),
      ArrowRight: () => addDays(focused_date, 1),
      ArrowUp: () => addDays(focused_date, -7),
      ArrowDown: () => addDays(focused_date, 7),
      Home: () => addDays(focused_date, -focused_date.getDay()),
      End: () => addDays(focused_date, 6 - focused_date.getDay()),
      PageUp: () => new Date(focused_date.getFullYear(), focused_date.getMonth() - 1, Math.min(focused_date.getDate(), 28)),
      PageDown: () => new Date(focused_date.getFullYear(), focused_date.getMonth() + 1, Math.min(focused_date.getDate(), 28)),
    };

    if (key_moves[e.key]) {
      e.preventDefault();
      moveFocus(key_moves[e.key]());
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectDate(focused_date);
    }
  }

  function handlePopoverKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeCalendar();
    }
  }

  const today = getToday();
  const days = buildCalendarDays(shown_month);
  const can_go_back = !min_date || shiftCalendarMonth(shown_month, -1).year * 12 + shiftCalendarMonth(shown_month, -1).month >= min_date.getFullYear() * 12 + min_date.getMonth();
  const can_go_forward = !max_date || shiftCalendarMonth(shown_month, 1).year * 12 + shiftCalendarMonth(shown_month, 1).month <= max_date.getFullYear() * 12 + max_date.getMonth();

  function isMonthDisabled(year: number, month: number) {
    const key = year * 12 + month;
    return (
      (min_date !== null && key < min_date.getFullYear() * 12 + min_date.getMonth()) ||
      (max_date !== null && key > max_date.getFullYear() * 12 + max_date.getMonth())
    );
  }

  return (
    <div ref={root_ref} className={styles.root}>
      <button
        ref={trigger_ref}
        id={field_id}
        type="button"
        disabled={disabled}
        aria-label={aria_label}
        aria-haspopup="dialog"
        aria-expanded={is_open}
        aria-controls={is_open ? popover_id : undefined}
        onClick={() => (is_open ? closeCalendar(false) : openCalendar())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !is_open) {
            e.preventDefault();
            openCalendar();
          }
        }}
        className={`${styles.trigger} ${is_open ? styles.isOpen : ""} ${has_error ? styles.hasError : ""}`}
      >
        <span className={styles.triggerIcon} aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
            <path strokeLinecap="round" d="M3.5 9.5h17M8 3v4M16 3v4" />
            {selected && <circle cx="12" cy="14.5" r="1.6" fill="currentColor" stroke="none" />}
          </svg>
        </span>
        <span className={selected ? styles.triggerValue : styles.triggerPlaceholder}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        {clearable && selected && !disabled ? (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear date"
            className={styles.clearButton}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        ) : (
          <span className={styles.chevron} aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        )}
      </button>

      {is_open && (
        <div
          id={popover_id}
          role="dialog"
          aria-modal="false"
          aria-label="Choose a date"
          onKeyDown={handlePopoverKeyDown}
          className={`${styles.popover} ${placement.vertical === "above" ? styles.isAbove : ""} ${placement.align === "right" ? styles.isRight : ""}`}
        >
          {/* Header */}
          <div className={styles.header}>
            <button
              type="button"
              className={styles.navButton}
              aria-label={view === "days" ? "Previous month" : "Previous year"}
              disabled={view === "days" && !can_go_back}
              onClick={() => setShownMonth((m) => shiftCalendarMonth(m, view === "days" ? -1 : -12))}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.titleButton}
              onClick={() => setView((v) => (v === "days" ? "months" : "days"))}
              aria-label={view === "days" ? "Choose month and year" : "Back to days"}
            >
              {view === "days" ? (
                <>
                  {MONTH_LABELS[shown_month.month]} <span>{shown_month.year}</span>
                </>
              ) : (
                <span>{shown_month.year}</span>
              )}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className={view === "months" ? styles.isFlipped : ""}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.navButton}
              aria-label={view === "days" ? "Next month" : "Next year"}
              disabled={view === "days" && !can_go_forward}
              onClick={() => setShownMonth((m) => shiftCalendarMonth(m, view === "days" ? 1 : 12))}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {view === "days" ? (
            <>
              <div className={styles.weekdays} aria-hidden>
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
              <div ref={grid_ref} role="grid" className={styles.grid} onKeyDown={handleGridKeyDown}>
                {days.map(({ date, is_in_month }) => {
                  const iso = toIsoDate(date);
                  const is_selected = isSameDay(date, selected);
                  const is_today = isSameDay(date, today);
                  const is_disabled = isDisabledDay(date);
                  const is_focused = isSameDay(date, focused_date);
                  return (
                    <button
                      key={iso}
                      type="button"
                      role="gridcell"
                      data-date={iso}
                      tabIndex={is_focused ? 0 : -1}
                      disabled={is_disabled}
                      aria-selected={is_selected}
                      aria-current={is_today ? "date" : undefined}
                      aria-label={formatAccessibleDate(date)}
                      onClick={() => selectDate(date)}
                      onFocus={() => !is_focused && setFocusedDate(date)}
                      className={[
                        styles.day,
                        !is_in_month ? styles.isOutside : "",
                        is_today ? styles.isToday : "",
                        is_selected ? styles.isSelected : "",
                      ].join(" ")}
                    >
                      {date.getDate()}
                      {marked.has(iso) && !is_selected && <span className={styles.marker} aria-hidden />}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className={styles.monthGrid}>
              {SHORT_MONTH_LABELS.map((label, month) => {
                const is_current = selected?.getFullYear() === shown_month.year && selected?.getMonth() === month;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={isMonthDisabled(shown_month.year, month)}
                    onClick={() => {
                      setShownMonth({ year: shown_month.year, month });
                      setFocusedDate(clampToRange(new Date(shown_month.year, month, Math.min(focused_date.getDate(), 28))));
                      setView("days");
                    }}
                    className={`${styles.monthCell} ${is_current ? styles.isSelected : ""}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className={styles.footer}>
            {footer_hint ? <span className={styles.footerHint}>{footer_hint}</span> : <span />}
            <div className={styles.footerActions}>
              {clearable && selected && (
                <button type="button" className={styles.footerButton} onClick={() => { onChange(""); closeCalendar(); }}>
                  Clear
                </button>
              )}
              {!isDisabledDay(today) && (
                <button type="button" className={`${styles.footerButton} ${styles.isPrimary}`} onClick={() => selectDate(today)}>
                  Today
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
