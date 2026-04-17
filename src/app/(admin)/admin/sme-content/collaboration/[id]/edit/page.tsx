import type { Metadata } from "next";
import SmeServiceFormPage from "@/components/admin/sme-content/SmeServiceFormPage";

export const metadata: Metadata = {
  title: "Edit Collaboration Tier | SME Content | Admin",
};

interface EditCollaborationTierPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCollaborationTierPage({ params }: EditCollaborationTierPageProps) {
  const { id } = await params;
  return <SmeServiceFormPage type="collaboration" service_id={id} />;
}
