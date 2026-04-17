import type { Metadata } from "next";
import AdminSmeAppointmentDetail from "@/components/admin/sme-appointments/AdminSmeAppointmentDetail";

interface PageProps {
  params: Promise<{ appointment_id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { appointment_id } = await params;
  return {
    title: `Appointment #${appointment_id} | Admin`,
  };
}

export default async function AdminSmeAppointmentDetailPage({ params }: PageProps) {
  const { appointment_id } = await params;
  return <AdminSmeAppointmentDetail appointment_id={Number(appointment_id)} />;
}
