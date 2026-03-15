import type { Metadata } from "next";
import React from "react";
import AdminOrganizationDetailContent from "@/components/admin/organizations/AdminOrganizationDetailContent";

interface AdminOrganizationDetailPageProps {
  params: Promise<{ organization_id: string }>;
}

export async function generateMetadata({ params }: AdminOrganizationDetailPageProps): Promise<Metadata> {
  const { organization_id } = await params;
  return {
    title: `Organization #${organization_id} | BASE Admin Portal`,
    description: "View and edit organization details.",
  };
}

export default async function AdminOrganizationDetailPage({ params }: AdminOrganizationDetailPageProps) {
  const { organization_id } = await params;
  return <AdminOrganizationDetailContent organization_id={Number(organization_id)} />;
}
