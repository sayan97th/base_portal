"use client";

import type { MouseEvent } from "react";
import {
  describeColumnFilterIndicator,
  describeColumnFilterSources,
  type ColumnFilterIndicator,
} from "@/lib/link-building-filtered-columns";
import styles from "./LinkBuildingOrdersTable.module.scss";

interface ColumnHeaderFilterButtonProps {
  column_label: string;
  /** Present when the column narrows the rows, from any filter source. */
  indicator: ColumnFilterIndicator | undefined;
  /** Tooltip shown while the column is not filtered. */
  idle_title: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

const FUNNEL_PATH =
  "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z";

/**
 * Funnel button of a column header. While the column is filtered it turns into a
 * solid amber pill with a filled funnel, plus a count when more than one filter
 * applies, and its tooltip lists every filter on the column.
 */
export default function ColumnHeaderFilterButton({
  column_label,
  indicator,
  idle_title,
  onClick,
}: ColumnHeaderFilterButtonProps) {
  const is_filtered = indicator !== undefined;
  const filter_count = indicator?.descriptions.length ?? 0;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      title={is_filtered ? describeColumnFilterIndicator(column_label, indicator) : idle_title}
      aria-label={
        is_filtered
          ? `Filter ${column_label}, ${describeColumnFilterSources(indicator)}`
          : `Filter ${column_label}`
      }
      aria-pressed={is_filtered}
      className={is_filtered ? styles.header_filter_button_active : styles.header_filter_button}
    >
      <svg
        className="h-3 w-3 shrink-0"
        fill={is_filtered ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={FUNNEL_PATH} />
      </svg>
      {filter_count > 1 && <span className={styles.header_filter_count}>{filter_count}</span>}
    </button>
  );
}
