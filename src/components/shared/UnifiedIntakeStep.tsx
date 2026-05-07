"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useCart } from "@/context/CartContext";
import IntakeFormTable from "@/components/new-content/IntakeFormTable";
import ContentOptimizationIntakeTable from "@/components/content-optimizations/ContentOptimizationIntakeTable";
import ContentBriefIntakeTable from "@/components/content-briefs/ContentBriefIntakeTable";
import KeywordEntryStep, {
  type KeywordRow,
  type KeywordData,
} from "@/components/link-building/KeywordEntryStep";
import type { CartIntakeRow, ContentOptimizationIntakeRow } from "@/types/client/unified-cart";

interface UnifiedIntakeStepProps {
  onBack: () => void;
  onNext: () => void;
  back_label?: string;
}

const empty_nc_row = (): CartIntakeRow => ({
  keyword_phrase: "",
  type_of_content: "",
  notes: "",
});

const empty_co_row = (): ContentOptimizationIntakeRow => ({
  primary_keyword: "",
  secondary_keywords: "",
  content_page_url: "",
});

const empty_keyword_row = (): KeywordRow => ({
  keyword: "",
  landing_page: "",
  exact_match: false,
});

export default function UnifiedIntakeStep({
  onBack,
  onNext,
  back_label = "Back to Selection",
}: UnifiedIntakeStepProps) {
  const {
    items,
    getIntakeDataForTier,
    updateNewContentIntakeData,
    getContentOptimizationIntakeDataForTier,
    updateContentOptimizationIntakeData,
    getContentBriefIntakeDataForTier,
    updateContentBriefIntakeData,
    getKeywordDataForTier,
    updateLinkBuildingKeywords,
    order_title,
    order_notes,
    setOrderTitle,
    setOrderNotes,
  } = useCart();

  const [error, setError] = useState<string | null>(null);

  // ── Item groups ─────────────────────────────────────────────────────────────

  const lb_items = useMemo(
    () => items.filter((i) => i.product_type === "link_building"),
    [items]
  );
  const nc_items = useMemo(
    () => items.filter((i) => i.product_type === "new_content"),
    [items]
  );
  const co_items = useMemo(
    () => items.filter((i) => i.product_type === "content_optimization"),
    [items]
  );
  const cb_items = useMemo(
    () => items.filter((i) => i.product_type === "content_brief"),
    [items]
  );

  const has_lb = lb_items.length > 0;
  const has_nc = nc_items.length > 0;
  const has_co = co_items.length > 0;
  const has_cb = cb_items.length > 0;

  // ── Link Building keyword rows ───────────────────────────────────────────────

  const lb_selected_items = useMemo(
    () =>
      lb_items.map((item) => ({
        id: item.tier_id,
        label: item.tier_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
    [lb_items]
  );

  const computed_keyword_rows = useMemo<KeywordData>(() => {
    const result: KeywordData = {};
    lb_items.forEach((item) => {
      const stored = getKeywordDataForTier(item.tier_id) as KeywordRow[];
      if (stored.length === item.quantity) {
        result[item.tier_id] = stored;
      } else if (stored.length < item.quantity) {
        result[item.tier_id] = [
          ...stored,
          ...Array.from(
            { length: item.quantity - stored.length },
            empty_keyword_row
          ),
        ];
      } else {
        result[item.tier_id] = stored.slice(0, item.quantity);
      }
    });
    return result;
  }, [lb_items, getKeywordDataForTier]);

  // ── New Content intake — one virtual tier per quantity unit ──────────────────

  const nc_intake_data = useMemo(() => {
    const result: Array<{ tier_id: string; tier_name: string; rows: CartIntakeRow[] }> = [];
    for (const item of nc_items) {
      const stored = getIntakeDataForTier(item.tier_id);
      for (let i = 0; i < item.quantity; i++) {
        const instance_rows = stored[i];
        result.push({
          tier_id: `${item.tier_id}:${i}`,
          tier_name:
            item.quantity > 1
              ? `${item.tier_name} (${i + 1} of ${item.quantity})`
              : item.tier_name,
          rows:
            instance_rows && instance_rows.length > 0
              ? instance_rows
              : [empty_nc_row()],
        });
      }
    }
    return result;
  }, [nc_items, getIntakeDataForTier]);

  // ── Content Optimization intake ──────────────────────────────────────────────

  const co_intake_data = useMemo(() => {
    return co_items.map((item) => {
      const stored = getContentOptimizationIntakeDataForTier(item.tier_id);
      const rows =
        stored.length >= item.quantity
          ? stored
          : [
              ...stored,
              ...Array.from(
                { length: item.quantity - stored.length },
                empty_co_row
              ),
            ];
      return { tier_id: item.tier_id, tier_name: item.tier_name, rows };
    });
  }, [co_items, getContentOptimizationIntakeDataForTier]);

  // ── Content Brief intake ─────────────────────────────────────────────────────

  const cb_intake_data = useMemo(() => {
    return cb_items.map((item) => {
      const stored = getContentBriefIntakeDataForTier(item.tier_id);
      const rows =
        stored.length >= item.quantity
          ? stored
          : [
              ...stored,
              ...Array.from(
                { length: item.quantity - stored.length },
                empty_co_row
              ),
            ];
      return { tier_id: item.tier_id, tier_name: item.tier_name, rows };
    });
  }, [cb_items, getContentBriefIntakeDataForTier]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleKeywordChange = useCallback(
    (
      tier_id: string,
      row_index: number,
      field: keyof KeywordRow,
      value: string | boolean
    ) => {
      if (error) setError(null);
      const base_rows = (computed_keyword_rows[tier_id] ?? []).map((r) => ({ ...r }));
      if (base_rows[row_index]) {
        base_rows[row_index] = { ...base_rows[row_index], [field]: value };
      }
      updateLinkBuildingKeywords(tier_id, base_rows);
    },
    [error, computed_keyword_rows, updateLinkBuildingKeywords]
  );

  const handleNcRowsChange = useCallback(
    (virtual_tier_id: string, rows: CartIntakeRow[]) => {
      if (error) setError(null);
      const sep = virtual_tier_id.lastIndexOf(":");
      const tier_id = virtual_tier_id.slice(0, sep);
      const instance_index = parseInt(virtual_tier_id.slice(sep + 1), 10);
      const item = nc_items.find((i) => i.tier_id === tier_id);
      if (!item) return;
      const stored = getIntakeDataForTier(tier_id);
      const updated: CartIntakeRow[][] = Array.from(
        { length: item.quantity },
        (_, k) => (k === instance_index ? rows : (stored[k] ?? [empty_nc_row()]))
      );
      updateNewContentIntakeData(tier_id, updated);
    },
    [error, nc_items, getIntakeDataForTier, updateNewContentIntakeData]
  );

  const handleCoRowsChange = useCallback(
    (tier_id: string, rows: ContentOptimizationIntakeRow[]) => {
      if (error) setError(null);
      updateContentOptimizationIntakeData(tier_id, rows);
    },
    [error, updateContentOptimizationIntakeData]
  );

  const handleCbRowsChange = useCallback(
    (tier_id: string, rows: ContentOptimizationIntakeRow[]) => {
      if (error) setError(null);
      updateContentBriefIntakeData(tier_id, rows);
    },
    [error, updateContentBriefIntakeData]
  );

  // ── Validation & navigation ───────────────────────────────────────────────────

  const handleNext = useCallback(() => {
    if (has_lb) {
      for (const rows of Object.values(computed_keyword_rows)) {
        for (const row of rows) {
          if (!row.keyword.trim() || !row.landing_page.trim()) {
            setError(
              "Please fill in the keyword and landing page for every Link Building placement before continuing."
            );
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
        }
      }
    }

    if (has_nc) {
      const incomplete = nc_intake_data.some((tier) =>
        tier.rows.some((row) => !row.keyword_phrase.trim())
      );
      if (incomplete) {
        setError(
          "Please fill in the keyword phrase for every New Content row before continuing."
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    if (has_co) {
      for (const tier of co_intake_data) {
        for (const row of tier.rows) {
          if (!row.primary_keyword.trim() || !row.content_page_url.trim()) {
            setError(
              "Please fill in the primary keyword and content page URL for every Content Optimization row before continuing."
            );
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
        }
      }
    }

    if (has_cb) {
      for (const tier of cb_intake_data) {
        for (const row of tier.rows) {
          if (!row.primary_keyword.trim() || !row.content_page_url.trim()) {
            setError(
              "Please fill in the primary keyword and current live URL for every Content Brief row before continuing."
            );
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
        }
      }
    }

    setError(null);
    onNext();
  }, [
    has_lb,
    has_nc,
    has_co,
    has_cb,
    computed_keyword_rows,
    nc_intake_data,
    co_intake_data,
    cb_intake_data,
    onNext,
  ]);

  const section_count =
    (has_lb ? 1 : 0) +
    (has_nc ? 1 : 0) +
    (has_co ? 1 : 0) +
    (has_cb ? 1 : 0);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {section_count > 1 ? "Intake Forms" : "Intake Form"}
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          {back_label}
        </button>
      </div>

      {/* Global validation error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Incomplete intake form
            </p>
            <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* ── Link Building section ─────────────────────────────────────────────── */}
      {has_lb && (
        <div className="space-y-4">
          {section_count > 1 && (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-coral-200 bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-700 dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-300">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                  />
                </svg>
                Link Building
              </span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>
          )}

          <KeywordEntryStep
            selected_items={lb_selected_items}
            keyword_data={computed_keyword_rows}
            order_title={order_title}
            order_notes={order_notes}
            onKeywordChange={handleKeywordChange}
            onOrderTitleChange={setOrderTitle}
            onOrderNotesChange={setOrderNotes}
          />
        </div>
      )}

      {/* ── New Content section ───────────────────────────────────────────────── */}
      {has_nc && (
        <div className="space-y-6">
          {section_count > 1 && (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                New Content
              </span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>
          )}
          {nc_intake_data.map((tier, idx) => (
            <IntakeFormTable
              key={tier.tier_id}
              tier_name={tier.tier_name}
              form_index={idx + 1}
              total_forms={nc_intake_data.length}
              rows={tier.rows}
              onChange={(rows) => handleNcRowsChange(tier.tier_id, rows)}
            />
          ))}
        </div>
      )}

      {/* ── Content Optimization section ──────────────────────────────────────── */}
      {has_co && (
        <div className="space-y-4">
          {section_count > 1 && (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
                Content Optimization
              </span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>
          )}

          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Fill in the target keywords and the live URL for each content page
              you&apos;d like optimized.
            </p>
          </div>

          <div className="space-y-6">
            {co_intake_data.map((tier, idx) => (
              <div
                key={tier.tier_id}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                {co_intake_data.length > 1 && (
                  <div className="mb-4 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Form {idx + 1} of {co_intake_data.length}
                    </span>
                  </div>
                )}
                <ContentOptimizationIntakeTable
                  tier_name={tier.tier_name}
                  rows={tier.rows}
                  onChange={(rows) => handleCoRowsChange(tier.tier_id, rows)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Content Briefs section ────────────────────────────────────────────── */}
      {has_cb && (
        <div className="space-y-4">
          {section_count > 1 && (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
                Content Briefs
              </span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>
          )}

          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Fill in the primary target keyword, secondary keywords, and the
              current live URL for each page you&apos;d like a content brief
              created for.
            </p>
          </div>

          <div className="space-y-6">
            {cb_intake_data.map((tier, idx) => (
              <div
                key={tier.tier_id}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                {cb_intake_data.length > 1 && (
                  <div className="mb-4 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Form {idx + 1} of {cb_intake_data.length}
                    </span>
                  </div>
                )}
                <ContentBriefIntakeTable
                  tier_name={tier.tier_name}
                  rows={tier.rows}
                  onChange={(rows) => handleCbRowsChange(tier.tier_id, rows)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review button */}
      <div className="flex items-center justify-end pt-2">
        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          Review
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
