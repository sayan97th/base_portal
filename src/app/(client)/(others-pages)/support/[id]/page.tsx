import { Metadata } from "next";
import TicketDetailPage from "@/components/support/TicketDetailPage";

export const metadata: Metadata = {
  title: "Ticket | BASE Portal",
  description: "View and reply to your support ticket.",
};

export default async function TicketRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TicketDetailPage ticket_id={Number(id)} />;
}
