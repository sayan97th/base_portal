"use client";
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import type { DashboardTableRow, DisplayStatus } from "@/services/client/dashboard.service";

interface Props {
  rows: DashboardTableRow[];
  is_loading: boolean;
}

const ITEMS_PER_PAGE = 10;

const status_badge_color: Record<
  DisplayStatus,
  "success" | "error" | "warning" | "info" | "primary"
> = {
  Live: "success",
  "Pending with publisher": "error",
  "Writing article": "warning",
  "Choosing domain": "info",
  "New request": "warning",
  Cancelled: "error",
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase();
}

function TableSkeleton() {
  return (
    <>
      {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
        <TableRow key={i}>
          {[...Array(10)].map((__, j) => (
            <TableCell key={j} className="py-3">
              <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export default function OrderStatusTable({ rows, is_loading }: Props) {
  const [search_term, setSearchTerm] = useState("");
  const [attribute_filter, setAttributeFilter] = useState("Links");
  const [current_page, setCurrentPage] = useState(1);

  // Reset to page 1 whenever search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search_term, attribute_filter]);

  const filtered_rows = useMemo(() => {
    const lower = search_term.toLowerCase();
    return rows.filter(
      (row) =>
        search_term === "" ||
        row.order_id.toLowerCase().includes(lower) ||
        (row.keyword ?? "").toLowerCase().includes(lower) ||
        row.status.toLowerCase().includes(lower) ||
        row.dr_type.toLowerCase().includes(lower)
    );
  }, [rows, search_term]);

  const total_pages = Math.max(1, Math.ceil(filtered_rows.length / ITEMS_PER_PAGE));

  const paginated_rows = useMemo(() => {
    const start = (current_page - 1) * ITEMS_PER_PAGE;
    return filtered_rows.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered_rows, current_page]);

  const range_start = filtered_rows.length === 0 ? 0 : (current_page - 1) * ITEMS_PER_PAGE + 1;
  const range_end = Math.min(current_page * ITEMS_PER_PAGE, filtered_rows.length);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-4 dark:border-gray-800 dark:bg-white/3 sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Order Status
          </h3>
          {!is_loading && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              {filtered_rows.length}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M7.25 1.5C4.075 1.5 1.5 4.075 1.5 7.25C1.5 10.425 4.075 13 7.25 13C10.425 13 13 10.425 13 7.25C13 4.075 10.425 1.5 7.25 1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M11.5 11.5L14.5 14.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Date, Keyword, DR"
              value={search_term}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder:text-gray-500"
            />
          </div>

          {/* Attribute Select */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Attribute</span>
            <select
              value={attribute_filter}
              onChange={(e) => setAttributeFilter(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-700 focus:border-brand-300 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="Links">Links</option>
              <option value="Content">Content</option>
              <option value="PR">PR</option>
            </select>
          </div>

          {/* Filter Icon */}
          <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M1.5 3.75H16.5M4.5 9H13.5M7 14.25H11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Share & Download */}
          <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
            SHARE
          </button>
          <button className="rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white hover:bg-coral-600">
            DOWNLOAD
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 dark:border-gray-800">
            <TableRow>
              {[
                "Order ID",
                "Start Date",
                "DR Type",
                "Keyword",
                "Landing Page",
                "Status",
                "Live Link",
                "Completed Date",
                "DR",
                "Actions",
              ].map((col) => (
                <TableCell
                  key={col}
                  isHeader
                  className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {is_loading ? (
              <TableSkeleton />
            ) : filtered_rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="py-12 text-center text-sm text-gray-400 dark:text-gray-500"
                >
                  {rows.length === 0
                    ? "No orders yet. Place your first order to get started."
                    : "No orders match your search."}
                </TableCell>
              </TableRow>
            ) : (
              paginated_rows.map((row, index) => (
                <TableRow key={`${row.order_id}-${index}`}>
                  {/* Order ID */}
                  <TableCell className="whitespace-nowrap py-3 font-mono text-xs font-medium text-gray-700 dark:text-gray-300">
                    <Link
                      href={`/link-building/orders/${row.order_id}`}
                      className="hover:text-coral-500 hover:underline"
                    >
                      {shortId(row.order_id)}
                    </Link>
                  </TableCell>

                  {/* Start Date */}
                  <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {formatDate(row.start_date)}
                  </TableCell>

                  {/* DR Type */}
                  <TableCell className="whitespace-nowrap py-3 text-gray-700 text-theme-sm dark:text-gray-300">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {row.dr_type}
                    </span>
                  </TableCell>

                  {/* Keyword */}
                  <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {row.keyword ?? (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </TableCell>

                  {/* Landing Page */}
                  <TableCell className="py-3 text-theme-sm">
                    {row.landing_page ? (
                      <a
                        href={row.landing_page}
                        className="block max-w-[200px] truncate text-blue-light-500 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        title={row.landing_page}
                      >
                        {row.landing_page}
                      </a>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="whitespace-nowrap py-3">
                    <Badge size="sm" color={status_badge_color[row.status]}>
                      {row.status}
                    </Badge>
                  </TableCell>

                  {/* Live Link */}
                  <TableCell className="py-3 text-theme-sm">
                    {row.live_link ? (
                      <a
                        href={row.live_link}
                        className="block max-w-[200px] truncate text-blue-light-500 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        title={row.live_link}
                      >
                        {row.live_link}
                      </a>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </TableCell>

                  {/* Completed Date */}
                  <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {row.completed_date ? formatDate(row.completed_date) : "—"}
                  </TableCell>

                  {/* DR score */}
                  <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                    {row.dr ?? "—"}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="whitespace-nowrap py-3">
                    <Link
                      href={`/link-building/orders/${row.order_id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-coral-200 bg-coral-50 px-3 py-1.5 text-xs font-medium text-coral-600 transition-colors hover:bg-coral-500 hover:text-white dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-400 dark:hover:bg-coral-500 dark:hover:text-white"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M6 2.5C3.5 2.5 1.5 6 1.5 6C1.5 6 3.5 9.5 6 9.5C8.5 9.5 10.5 6 10.5 6C10.5 6 8.5 2.5 6 2.5Z"
                          stroke="currentColor"
                          strokeWidth="1.2"
                        />
                        <circle
                          cx="6"
                          cy="6"
                          r="1.5"
                          stroke="currentColor"
                          strokeWidth="1.2"
                        />
                      </svg>
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!is_loading && total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-1 pt-4 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {range_start}–{range_end} of {filtered_rows.length} orders &nbsp;·&nbsp; Page{" "}
            <span className="font-medium">{current_page}</span> of{" "}
            <span className="font-medium">{total_pages}</span>
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={current_page === 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(total_pages, p + 1))}
              disabled={current_page === total_pages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
