import type { Metadata } from "next";
import DeliverablesPage from "@/components/deliverables/DeliverablesPage";

export const metadata: Metadata = {
  title: "Deliverables | BASE Search Marketing",
  description: "View all your order reports and link delivery progress.",
};

export default function Deliverables() {
  return <DeliverablesPage />;
}
