import type { Metadata } from "next";
import SmeServiceFormPage from "@/components/admin/sme-content/SmeServiceFormPage";

export const metadata: Metadata = {
  title: "New Enhanced Tier | SME Content | Admin",
};

export default function NewEnhancedTierPage() {
  return <SmeServiceFormPage type="enhanced" />;
}
