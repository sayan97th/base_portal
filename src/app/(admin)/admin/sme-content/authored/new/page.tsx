import type { Metadata } from "next";
import SmeServiceFormPage from "@/components/admin/sme-content/SmeServiceFormPage";

export const metadata: Metadata = {
  title: "New Authored Tier | SME Content | Admin",
};

export default function NewAuthoredTierPage() {
  return <SmeServiceFormPage type="authored" />;
}
