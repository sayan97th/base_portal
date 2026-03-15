import { Metadata } from "next";
import SupportPage from "@/components/support/SupportPage";

export const metadata: Metadata = {
  title: "Support | BASE Portal",
  description: "Manage your support tickets and requests.",
};

export default function SupportRoute() {
  return <SupportPage />;
}
