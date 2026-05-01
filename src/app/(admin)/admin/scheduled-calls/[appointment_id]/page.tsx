import type { Metadata } from "next";
import AdminScheduledCallDetail from "@/components/admin/scheduled-calls/AdminScheduledCallDetail";

interface PageProps {
  params: Promise<{ appointment_id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { appointment_id } = await params;
  return {
    title: `Scheduled Call #${appointment_id} | Admin`,
  };
}

export default async function AdminScheduledCallDetailPage({ params }: PageProps) {
  const { appointment_id } = await params;
  return <AdminScheduledCallDetail appointment_id={Number(appointment_id)} />;
}
