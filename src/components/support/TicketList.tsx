"use client";

import React, { useState } from "react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Ticket,
  TicketFilterTab,
  filter_tabs,
  status_color_map,
  status_label_map,
  status_dot_color_map,
} from "./supportData";

interface TicketListProps {
  tickets: Ticket[];
  onNewTicket: () => void;
}

const TicketList: React.FC<TicketListProps> = ({ tickets, onNewTicket }) => {
  const [active_tab, setActiveTab] = useState<TicketFilterTab>("all");

  const filtered_tickets =
    active_tab === "all"
      ? tickets
      : tickets.filter((ticket) => ticket.status === active_tab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Tickets
        </h1>
        <Button variant="coral" size="sm" onClick={onNewTicket}>
          New ticket
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          {filter_tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                active_tab === tab.value
                  ? "border-brand-500 text-brand-500 dark:text-brand-400 dark:border-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Subject
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Date
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Status
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered_tickets.length > 0 ? (
                filtered_tickets.map((ticket) => (
                  <TableRow
                    key={ticket.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {ticket.subject}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-700 dark:text-gray-300">
                      {ticket.created_at}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <Badge
                        variant="light"
                        size="sm"
                        color={status_color_map[ticket.status]}
                        startIcon={
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${status_dot_color_map[ticket.status]}`}
                          />
                        }
                      >
                        {status_label_map[ticket.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400"
                  >
                    No tickets yet...
                  </TableCell>
                  <TableCell className="px-5 py-4">{""}</TableCell>
                  <TableCell className="px-5 py-4">{""}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default TicketList;
