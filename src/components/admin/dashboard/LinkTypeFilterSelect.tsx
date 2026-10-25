"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./LinkTypeFilterSelect.module.scss";

interface LinkTypeFilterSelectProps {
  /** Applied link type, an empty string means every link type is shown. */
  value: string;
  /** Link types in display order, e.g. "DR 30+ External". */
  options: readonly string[];
  onChange: (value: string) => void;
}

interface LinkTypeGroup {
  name: string;
  options: { value: string; label: string }[];
}

const ALL_OPTION_LABEL = "All link types";

/**
 * Splits "DR 30+ External" into its placement group ("External") and a short
 * label ("DR 30+"), so the list can be grouped instead of repeating the suffix.
 */
function groupLinkTypes(options: readonly string[]): LinkTypeGroup[] {
  const groups = new Map<string, LinkTypeGroup>();
  for (const option of options) {
    const split_index = option.lastIndexOf(" ");
    const name = split_index > 0 ? option.slice(split_index + 1) : "Other";
    const label = split_index > 0 ? option.slice(0, split_index) : option;
    if (!groups.has(name)) groups.set(name, { name, options: [] });
    groups.get(name)!.options.push({ value: option, label });
  }
  return Array.from(groups.values());
}

function getGroupTone(group_name: string): string {
  if (group_name === "External") return styles.tone_external;
  if (group_name === "Internal") return styles.tone_internal;
  return "";
}

/**
 * "Link type" filter on the Link Building Orders toolbar. A styled listbox in place
 * of the native select: options are grouped by placement (External / Internal),
 * the applied value shows a check and can be cleared from the trigger, and the
 * list is fully usable from the keyboard (arrows, Home / End, Enter, Escape).
 */
export default function LinkTypeFilterSelect({ value, options, onChange }: LinkTypeFilterSelectProps) {
  const [is_open, setIsOpen] = useState(false);
  const [active_index, setActiveIndex] = useState(0);

  const container_ref = useRef<HTMLDivElement>(null);
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const listbox_ref = useRef<HTMLDivElement>(null);
  const listbox_id = useId();

  const groups = useMemo(() => groupLinkTypes(options), [options]);
  // Flat, navigable order: "All link types" first, then every option group by group.
  const flat_values = useMemo(() => ["", ...groups.flatMap((g) => g.options.map((o) => o.value))], [groups]);
  const selected_option = useMemo(
    () => groups.flatMap((g) => g.options.map((o) => ({ ...o, group: g.name }))).find((o) => o.value === value),
    [groups, value]
  );
  const getOptionId = (index: number) => `${listbox_id}-option-${index}`;

  // ── Open / close ──────────────────────────────────────────────────────────

  const openList = useCallback(
    (start_at?: "first" | "last") => {
      const selected_index = Math.max(0, flat_values.indexOf(value));
      setActiveIndex(start_at === "first" ? 0 : start_at === "last" ? flat_values.length - 1 : selected_index);
      setIsOpen(true);
    },
    [flat_values, value]
  );

  const closeList = useCallback((should_restore_focus = true) => {
    setIsOpen(false);
    if (should_restore_focus) trigger_ref.current?.focus();
  }, []);

  const selectValue = useCallback(
    (next_value: string) => {
      if (next_value !== value) onChange(next_value);
      closeList();
    },
    [value, onChange, closeList]
  );

  useEffect(() => {
    if (!is_open) return;
    listbox_ref.current?.focus();
    const handleClickOutside = (e: MouseEvent) => {
      if (container_ref.current && !container_ref.current.contains(e.target as Node)) closeList(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [is_open, closeList]);

  // Keeps the highlighted option visible while moving through the list with the keyboard.
  useEffect(() => {
    if (!is_open) return;
    document.getElementById(getOptionId(active_index))?.scrollIntoView?.({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_open, active_index]);

  // ── Keyboard ──────────────────────────────────────────────────────────────

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openList(e.key === "ArrowUp" ? "last" : undefined);
    }
  };

  const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const last_index = flat_values.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(last_index, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(last_index);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        selectValue(flat_values[active_index]);
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        closeList();
        break;
      case "Tab":
        closeList(false);
        break;
    }
  };

  // ── Rendering ─────────────────────────────────────────────────────────────

  const check_icon = (
    <svg className={styles.check_icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );

  const renderOption = (option_value: string, index: number, content: React.ReactNode, tone_class = "") => {
    const is_selected = option_value === value;
    const is_active = index === active_index;
    return (
      <div
        key={option_value || "all"}
        id={getOptionId(index)}
        role="option"
        aria-selected={is_selected}
        // Full value ("DR 50+ External"), the visible label drops the group suffix
        aria-label={option_value || ALL_OPTION_LABEL}
        className={`${styles.option}${tone_class ? ` ${tone_class}` : ""}${is_selected ? ` ${styles.is_selected}` : ""}${is_active ? ` ${styles.is_active}` : ""}`}
        onMouseMove={() => !is_active && setActiveIndex(index)}
        onClick={() => selectValue(option_value)}
      >
        {content}
        {is_selected && check_icon}
      </div>
    );
  };

  let option_index = 0;

  return (
    <div
      ref={container_ref}
      className={`${styles.root}${value ? ` ${styles.has_value}` : ""}${is_open ? ` ${styles.is_open}` : ""}`}
    >
      <button
        ref={trigger_ref}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={is_open}
        aria-controls={is_open ? listbox_id : undefined}
        aria-label={`Filter by link type, ${selected_option ? selected_option.value : ALL_OPTION_LABEL}`}
        title={selected_option?.value}
        className={styles.trigger}
        onClick={() => (is_open ? closeList() : openList())}
        onKeyDown={handleTriggerKeyDown}
      >
        <svg className={styles.leading_icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
        {selected_option ? (
          <span className={styles.trigger_value}>
            <span className={styles.trigger_label}>{selected_option.label}</span>
            <span className={`${styles.group_badge} ${getGroupTone(selected_option.group)}`}>{selected_option.group}</span>
          </span>
        ) : (
          <span className={`${styles.trigger_value} ${styles.trigger_placeholder}`}>{ALL_OPTION_LABEL}</span>
        )}
        {!value && (
          <svg className={styles.chevron} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </button>

      {/* Sibling of the trigger, a button cannot be nested inside another button */}
      {value && (
        <button type="button" className={styles.clear_button} onClick={() => onChange("")} aria-label="Clear link type filter">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {is_open && (
        <div
          ref={listbox_ref}
          id={listbox_id}
          role="listbox"
          tabIndex={-1}
          aria-label="Link type"
          aria-activedescendant={getOptionId(active_index)}
          className={styles.panel}
          onKeyDown={handleListKeyDown}
        >
          {renderOption("", option_index++, <span className={styles.option_label}>{ALL_OPTION_LABEL}</span>)}
          {groups.map((group) => (
            <div key={group.name} role="group" aria-label={group.name} className={styles.group}>
              <div className={`${styles.group_header} ${getGroupTone(group.name)}`} aria-hidden="true">
                <span className={styles.group_dot} />
                {group.name}
              </div>
              {group.options.map((option) =>
                renderOption(
                  option.value,
                  option_index++,
                  <span className={styles.option_label}>{option.label}</span>,
                  getGroupTone(group.name)
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
