import type { Metadata } from "next";
import SmeServiceFormPage from "@/components/admin/sme-content/SmeServiceFormPage";

export const metadata: Metadata = {
  title: "Edit Authored Tier | SME Content | Admin",
};

interface EditAuthoredTierPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAuthoredTierPage({ params }: EditAuthoredTierPageProps) {
  const { id } = await params;
  return <SmeServiceFormPage type="authored" service_id={id} />;
}
