import type { Metadata } from "next";
import AdminPremiumMentionsAppointmentDetail from "@/components/admin/premium-mentions/AdminPremiumMentionsAppointmentDetail";

interface PageProps {
  params: Promise<{ appointment_id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { appointment_id } = await params;
  return {
    title: `Premium Mentions Appointment #${appointment_id} | Admin`,
  };
}

export default async function AdminPremiumMentionsAppointmentDetailPage({ params }: PageProps) {
  const { appointment_id } = await params;
  return <AdminPremiumMentionsAppointmentDetail appointment_id={Number(appointment_id)} />;
}
