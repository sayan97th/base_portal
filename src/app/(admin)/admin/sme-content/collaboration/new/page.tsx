import type { Metadata } from "next";
import SmeServiceFormPage from "@/components/admin/sme-content/SmeServiceFormPage";

export const metadata: Metadata = {
  title: "New Collaboration Tier | SME Content | Admin",
};

export default function NewCollaborationTierPage() {
  return <SmeServiceFormPage type="collaboration" />;
}
