import { Metadata } from "next";
import TicketDetailPage from "@/components/support/TicketDetailPage";

export const metadata: Metadata = {
  title: "Ticket | BASE Portal",
  description: "View and reply to your support ticket.",
};

export default function TicketRoute({ params }: { params: { id: string } }) {
  return <TicketDetailPage ticket_id={Number(params.id)} />;
}
