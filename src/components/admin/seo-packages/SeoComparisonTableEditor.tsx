"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { AdminSeoPackage } from "@/types/admin/seo-packages";
import type { AdminSeoComparisonRow } from "@/types/admin/seo-packages";
import {
  getAdminSeoComparison,
  updateAdminSeoComparison,
} from "@/services/admin/seo-packages.service";

interface SeoComparisonTableEditorProps {
  packages: AdminSeoPackage[];
}

function createEmptyRow(sort_order: number, package_ids: string[]): AdminSeoComparisonRow {
  return {
    id: null,
    label: "",
    sort_order,
    values: Object.fromEntries(package_ids.map((id) => [id, ""])),
  };
}

export default function SeoComparisonTableEditor({ packages }: SeoComparisonTableEditorProps) {
  const [rows, setRows] = useState<AdminSeoComparisonRow[]>([]);
  const [is_loading, setIsLoading] = useState(true);
  const [is_saving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success_message, setSuccessMessage] = useState<string | null>(null);

  const package_ids = packages.map((p) => p.id);

  const fetchRows = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAdminSeoComparison();
      setRows(
        [...data]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((row) => ({
            ...row,
            values: Object.fromEntries(package_ids.map((id) => [id, row.values[id] ?? ""])),
          }))
      );
    } catch {
      setError("Failed to load the Quick Comparison table. Please try again.");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages.length]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const updateRowLabel = (index: number, label: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, label } : row)));
  };

  const updateRowValue = (index: number, package_id: string, value: string) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, values: { ...row.values, [package_id]: value } } : row
      )
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow(prev.length, package_ids)]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setRows((prev) => {
      const target_index = index + direction;
      if (target_index < 0 || target_index >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target_index]] = [next[target_index], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const payload_rows = rows.map((row, index) => ({
        ...row,
        label: row.label.trim(),
        sort_order: index,
      }));
      const saved = await updateAdminSeoComparison({ rows: payload_rows });
      setRows(
        [...saved]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((row) => ({
            ...row,
            values: Object.fromEntries(package_ids.map((id) => [id, row.values[id] ?? ""])),
          }))
      );
      setSuccessMessage("Quick Comparison table saved.");
    } catch {
      setError("Failed to save the Quick Comparison table. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (is_loading) {
    return (
      <div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    );
  }

  if (packages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Add at least one SEO package before configuring the Quick Comparison table.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Quick Comparison Table
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Shown below the package cards on the client-facing SEO Packages page.
          </p>
        </div>
        <button
          onClick={addRow}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 dark:border-brand-800 dark:text-brand-400 dark:hover:bg-brand-500/10"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Row
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {error}
        </div>
      )}
      {success_message && (
        <div className="mb-4 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400">
          {success_message}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-8 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            No comparison rows yet. Click &ldquo;Add Row&rdquo; to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60">
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Feature
                </th>
                {packages.map((pkg) => (
                  <th
                    key={pkg.id}
                    className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                  >
                    {pkg.name}
                  </th>
                ))}
                <th className="w-28 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id ?? `new-${index}`} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2 align-top">
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => updateRowLabel(index, e.target.value)}
                      placeholder="e.g. Strategy"
                      className="h-9 w-full min-w-[140px] rounded-lg border border-gray-300 px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                    />
                  </td>
                  {packages.map((pkg) => (
                    <td key={pkg.id} className="px-3 py-2 align-top">
                      <input
                        type="text"
                        value={row.values[pkg.id] ?? ""}
                        onChange={(e) => updateRowValue(index, pkg.id, e.target.value)}
                        placeholder="Value"
                        className="h-9 w-full min-w-[140px] rounded-lg border border-gray-300 px-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => moveRow(index, -1)}
                        disabled={index === 0}
                        title="Move up"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-800"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveRow(index, 1)}
                        disabled={index === rows.length - 1}
                        title="Move down"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-gray-800"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        title="Remove row"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-error-500 transition-colors hover:bg-error-50 dark:hover:bg-error-500/10"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          onClick={handleSave}
          disabled={is_saving}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {is_saving && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          Save Comparison Table
        </button>
      </div>
    </div>
  );
}
