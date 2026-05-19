import { Metadata } from "next";
import NewTicketForm from "@/components/support/NewTicketForm";

export const metadata: Metadata = {
  title: "New Ticket | BASE Portal",
  description: "Submit a new support ticket.",
};

export default function NewTicketRoute() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-8">
      <NewTicketForm />
    </div>
  );
}
