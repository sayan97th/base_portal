import { Metadata } from "next";
import ClientCalendlyPage from "@/components/client-calendly/ClientCalendlyPage";

export const metadata: Metadata = {
  title: "Book an Appointment | BASE Portal",
  description: "Schedule a meeting with our team. Pick a date and time that works best for you.",
};

export default function ClientCalendlyRoute() {
  return <ClientCalendlyPage />;
}
