"use client";
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";

type OrderStatus =
  | "Live"
  | "Pending with publisher"
  | "Writing article"
  | "Choosing domain"
  | "New request";

interface OrderRow {
  orderId: string;
  startDate: string;
  drType: string;
  keyword: string;
  landingPage: string;
  status: OrderStatus;
  liveLink: string;
  completedDate: string;
  dr: number | null;
}

const statusColorMap: Record<
  OrderStatus,
  "success" | "error" | "warning" | "info" | "primary"
> = {
  Live: "success",
  "Pending with publisher": "error",
  "Writing article": "warning",
  "Choosing domain": "info",
  "New request": "warning",
};

const orderStatusData: OrderRow[] = [
  {
    orderId: "ACT-001",
    startDate: "February 1, 2026",
    drType: "DR 60+",
    keyword: "data governance",
    landingPage: "https://www.actian.com/fr/what-is-metadata-management/",
    status: "Live",
    liveLink: "https://greenrecord.co.uk/strengthening-information",
    completedDate: "February 10, 2026",
    dr: 62,
  },
  {
    orderId: "ACT-001",
    startDate: "February 1, 2026",
    drType: "DR 60+",
    keyword: "data governance",
    landingPage: "https://www.actian.com/fr/what-is-metadata-management/",
    status: "Live",
    liveLink: "https://greenrecord.co.uk/strengthening-information",
    completedDate: "February 10, 2026",
    dr: 62,
  },
  {
    orderId: "ACT-001",
    startDate: "February 1, 2026",
    drType: "DR 60+",
    keyword: "data governance",
    landingPage: "https://www.actian.com/fr/what-is-metadata-management/",
    status: "Pending with publisher",
    liveLink: "",
    completedDate: "",
    dr: null,
  },
  {
    orderId: "ACT-001",
    startDate: "February 1, 2026",
    drType: "DR 60+",
    keyword: "data governance",
    landingPage: "https://www.actian.com/fr/what-is-metadata-management/",
    status: "Pending with publisher",
    liveLink: "",
    completedDate: "",
    dr: null,
  },
  {
    orderId: "ACT-001",
    startDate: "February 1, 2026",
    drType: "DR 60+",
    keyword: "data governance",
    landingPage: "https://www.actian.com/fr/what-is-metadata-management/",
    status: "Writing article",
    liveLink: "",
    completedDate: "",
    dr: null,
  },
  {
    orderId: "ACT-001",
    startDate: "February 1, 2026",
    drType: "DR 60+",
    keyword: "data governance",
    landingPage: "https://www.actian.com/fr/what-is-metadata-management/",
    status: "Writing article",
    liveLink: "",
    completedDate: "",
    dr: null,
  },
  {
    orderId: "ACT-001",
    startDate: "February 1, 2026",
    drType: "DR 60+",
    keyword: "data governance",
    landingPage: "https://www.actian.com/fr/what-is-metadata-management/",
    status: "Choosing domain",
    liveLink: "",
    completedDate: "",
    dr: null,
  },
  {
    orderId: "ACT-001",
    startDate: "February 1, 2026",
    drType: "DR 60+",
    keyword: "data governance",
    landingPage: "https://www.actian.com/fr/what-is-metadata-management/",
    status: "Choosing domain",
    liveLink: "",
    completedDate: "",
    dr: null,
  },
  {
    orderId: "ACT-001",
    startDate: "February 1, 2026",
    drType: "DR 60+",
    keyword: "data governance",
    landingPage: "https://www.actian.com/fr/what-is-metadata-management/",
    status: "Choosing domain",
    liveLink: "",
    completedDate: "",
    dr: null,
  },
  {
    orderId: "ACT-001",
    startDate: "February 1, 2026",
    drType: "DR 60+",
    keyword: "data governance",
    landingPage: "https://www.actian.com/fr/what-is-metadata-management/",
    status: "New request",
    liveLink: "",
    completedDate: "",
    dr: null,
  },
  {
    orderId: "ACT-001",
    startDate: "February 1, 2026",
    drType: "DR 60+",
    keyword: "data governance",
    landingPage: "https://www.actian.com/fr/what-is-metadata-management/",
    status: "New request",
    liveLink: "",
    completedDate: "",
    dr: null,
  },
  {
    orderId: "ACT-001",
    startDate: "February 1, 2026",
    drType: "DR 60+",
    keyword: "data governance",
    landingPage: "https://www.actian.com/fr/what-is-metadata-management/",
    status: "New request",
    liveLink: "",
    completedDate: "",
    dr: null,
  },
];

export default function OrderStatusTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [attributeFilter, setAttributeFilter] = useState("Links");

  const filteredData = orderStatusData.filter(
    (row) =>
      row.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-4 pb-4 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">

          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Actian&apos;s Order Status
          </h3>
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-transparent py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder:text-gray-500"
            />
          </div>

          {/* Attribute Select */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Attribute</span>
            <select
              value={attributeFilter}
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
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Order ID
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Start Date
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                DR Type
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Keyword
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Landing Page
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Live Link
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                Completed Date
              </TableCell>
              <TableCell
                isHeader
                className="py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                DR
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredData.map((row, index) => (
              <TableRow key={index}>
                <TableCell className="whitespace-nowrap py-3 text-gray-700 text-theme-sm dark:text-gray-300">
                  {row.orderId}
                </TableCell>
                <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {row.startDate}
                </TableCell>
                <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {row.drType}
                </TableCell>
                <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {row.keyword}
                </TableCell>
                <TableCell className="py-3 text-theme-sm">
                  {row.landingPage ? (
                    <a
                      href={row.landingPage}
                      className="text-blue-light-500 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {row.landingPage}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap py-3">
                  <Badge
                    size="sm"
                    color={statusColorMap[row.status]}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 text-theme-sm">
                  {row.liveLink ? (
                    <a
                      href={row.liveLink}
                      className="text-blue-light-500 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {row.liveLink}
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {row.completedDate || "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                  {row.dr ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
