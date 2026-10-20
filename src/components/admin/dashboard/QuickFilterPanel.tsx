"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { QuickFilterFacet, QuickFilterOption } from "@/lib/link-building-quick-filters";

interface QuickFilterPanelProps {
  facets: QuickFilterFacet[];
  is_loading: boolean;
  has_error: boolean;
  onToggle: (key: string, value: string) => void;
  onClearFacet: (key: string) => void;
}

/** Share of the visible width one click on a side arrow scrolls the columns by. */
const ARROW_SCROLL_RATIO = 0.8;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function OptionAvatar({ avatar }: { avatar: NonNullable<QuickFilterOption["avatar"]> }) {
  if (avatar.url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar.url} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />;
  }
  if (avatar.name === "") {
    // Unassigned, an empty person outline as on monday.
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-400 dark:border-gray-600" aria-hidden="true">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[9px] font-semibold text-white" aria-hidden="true">
      {initials(avatar.name)}
    </span>
  );
}

/**
 * Tracks whether the columns row has content hidden past either edge, so the
 * round side arrows only show while there is somewhere to scroll.
 */
function useHorizontalOverflow(scroller_ref: React.RefObject<HTMLDivElement | null>, content_key: string) {
  const [overflow, setOverflow] = useState({ can_scroll_start: false, can_scroll_end: false });

  useEffect(() => {
    const scroller = scroller_ref.current;
    if (!scroller) return;
    const measure = () => {
      const can_scroll_start = scroller.scrollLeft > 1;
      const can_scroll_end = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1;
      setOverflow((current) =>
        current.can_scroll_start === can_scroll_start && current.can_scroll_end === can_scroll_end
          ? current
          : { can_scroll_start, can_scroll_end }
      );
    };
    // Measured on the next frame, once the columns have their final width.
    const frame = requestAnimationFrame(measure);
    scroller.addEventListener("scroll", measure, { passive: true });
    const resize_observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    resize_observer?.observe(scroller);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", measure);
      resize_observer?.disconnect();
    };
  }, [scroller_ref, content_key]);

  const scrollByPage = (direction: 1 | -1) => {
    const scroller = scroller_ref.current;
    scroller?.scrollBy?.({ left: direction * scroller.clientWidth * ARROW_SCROLL_RATIO, behavior: "smooth" });
  };

  return { ...overflow, scrollByPage };
}

function ScrollArrow({ side, onClick }: { side: "start" | "end"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "end" ? "Show more columns" : "Show previous columns"}
      className={`absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 ${
        side === "end" ? "right-1" : "left-1"
      }`}
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d={side === "end" ? "M8.25 4.5l7.5 7.5-7.5 7.5" : "M15.75 19.5L8.25 12l7.5-7.5"} />
      </svg>
    </button>
  );
}

/**
 * monday style Quick filters: one column per field, each value a pill with its
 * row count. One click picks a value, several picks in a column match any of
 * them, and picks across columns all apply together. Counts follow every other
 * active filter, and values without matching rows are faded but still pickable.
 */
export default function QuickFilterPanel({ facets, is_loading, has_error, onToggle, onClearFacet }: QuickFilterPanelProps) {
  const [query, setQuery] = useState("");
  const trimmed_query = query.trim().toLowerCase();
  const scroller_ref = useRef<HTMLDivElement>(null);

  const visible_facets = useMemo(
    () =>
      facets
        .map((facet) => {
          // A column whose own name matches keeps every value, otherwise only the matching values stay.
          if (!trimmed_query || facet.label.toLowerCase().includes(trimmed_query)) return facet;
          return { ...facet, options: facet.options.filter((option) => option.label.toLowerCase().includes(trimmed_query)) };
        })
        .filter((facet) => facet.options.length > 0 || (!trimmed_query && is_loading)),
    [facets, trimmed_query, is_loading]
  );

  const { can_scroll_start, can_scroll_end, scrollByPage } = useHorizontalOverflow(
    scroller_ref,
    visible_facets.map((facet) => `${facet.key}:${facet.options.length}`).join("|")
  );

  return (
    <div className="px-4 pb-4 pt-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">All columns</p>
        <label className="relative w-full sm:w-56">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search values"
            aria-label="Search quick filter values"
            className="h-8 w-full rounded-lg border border-gray-200 bg-white pl-8 pr-2.5 text-xs text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
        </label>
      </div>

      {has_error && (
        <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          Could not load the latest counts. The values below may be out of date.
        </p>
      )}

      {visible_facets.length === 0 ? (
        <p className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
          {trimmed_query ? `No values match "${query.trim()}".` : "No values to filter by yet."}
        </p>
      ) : (
        <div className="relative">
          {can_scroll_start && <ScrollArrow side="start" onClick={() => scrollByPage(-1)} />}
          <div ref={scroller_ref} className="flex gap-6 overflow-x-auto pb-3 [scrollbar-width:thin]">
            {visible_facets.map((facet) => {
              const has_picks = facet.selected_values.length > 0;
              return (
                <div key={facet.key} role="group" aria-label={facet.label} className="flex w-44 shrink-0 flex-col">
                  <div className="mb-2 flex h-5 items-center justify-between gap-2">
                    <span className={`truncate text-[13px] ${has_picks ? "font-semibold text-gray-800 dark:text-gray-100" : "text-gray-600 dark:text-gray-300"}`}>
                      {facet.label}
                    </span>
                    {has_picks && (
                      <button
                        type="button"
                        onClick={() => onClearFacet(facet.key)}
                        aria-label={`Clear ${facet.label}`}
                        className="shrink-0 text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-400"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex max-h-52 flex-col gap-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
                    {facet.options.length === 0
                      ? [0, 1, 2, 3].map((i) => (
                          <span key={i} className="h-8 shrink-0 animate-pulse rounded-md bg-gray-100 dark:bg-gray-700/60" aria-hidden="true" />
                        ))
                      : facet.options.map((option) => {
                          const is_selected = facet.selected_values.includes(option.value);
                          const is_empty = option.count === 0 && !is_selected;
                          return (
                            <button
                              key={`${facet.key}_${option.value}`}
                              type="button"
                              onClick={() => onToggle(facet.key, option.value)}
                              aria-pressed={is_selected}
                              title={`${facet.label}: ${option.label} (${option.count})`}
                              className={`flex h-8 shrink-0 items-center gap-2 rounded-md border px-2.5 text-left text-[13px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                                is_selected
                                  ? "border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-600 dark:bg-brand-500/15 dark:text-brand-200"
                                  : "border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700/60 dark:text-gray-200 dark:hover:bg-gray-700"
                              } ${is_empty ? "opacity-50" : ""}`}
                            >
                              {option.avatar ? (
                                <OptionAvatar avatar={option.avatar} />
                              ) : option.dot_class ? (
                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${option.dot_class}`} aria-hidden="true" />
                              ) : null}
                              <span className={`min-w-0 flex-1 truncate ${option.value === "" ? "italic" : ""}`}>{option.label}</span>
                              <span className={`shrink-0 text-[11px] tabular-nums ${is_selected ? "text-brand-600 dark:text-brand-300" : "text-gray-400"}`}>
                                {option.count}
                              </span>
                            </button>
                          );
                        })}
                  </div>
                  {facet.has_more && (
                    <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">Top values shown. Use Search to find others.</p>
                  )}
                </div>
              );
            })}
          </div>
          {can_scroll_end && <ScrollArrow side="end" onClick={() => scrollByPage(1)} />}
        </div>
      )}
    </div>
  );
}
