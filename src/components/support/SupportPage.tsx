"use client";

import React, { useState } from "react";
import TicketList from "./TicketList";
import NewTicketForm from "./NewTicketForm";
import { Ticket, ticket_list } from "./supportData";

type SupportView = "list" | "new_ticket";

const SupportPage: React.FC = () => {
  const [current_view, setCurrentView] = useState<SupportView>("list");
  const [tickets, setTickets] = useState<Ticket[]>(ticket_list);

  const handleCreateTicket = (ticket_data: {
    subject: string;
    related_order: string;
    message: string;
  }) => {
    const new_ticket: Ticket = {
      id: `TKT-${String(tickets.length + 1).padStart(3, "0")}`,
      subject: ticket_data.subject,
      created_at: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      status: "open",
      priority: "medium",
      related_order: ticket_data.related_order,
      messages: [
        {
          id: "msg_1",
          content: ticket_data.message,
          sender: "You",
          created_at: new Date().toISOString(),
        },
      ],
    };

    setTickets((prev) => [new_ticket, ...prev]);
    setCurrentView("list");
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-8">
      {current_view === "list" && (
        <TicketList
          tickets={tickets}
          onNewTicket={() => setCurrentView("new_ticket")}
        />
      )}
      {current_view === "new_ticket" && (
        <NewTicketForm
          onBack={() => setCurrentView("list")}
          onSubmit={handleCreateTicket}
        />
      )}
    </div>
  );
};

export default SupportPage;
