import type { Metadata } from "next";
import SmeServiceFormPage from "@/components/admin/sme-content/SmeServiceFormPage";

export const metadata: Metadata = {
  title: "Edit Enhanced Tier | SME Content | Admin",
};

interface EditEnhancedTierPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditEnhancedTierPage({ params }: EditEnhancedTierPageProps) {
  const { id } = await params;
  return <SmeServiceFormPage type="enhanced" service_id={id} />;
}
