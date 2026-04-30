import type { Metadata } from "next";
import AdminSeoPackagesAppointmentDetail from "@/components/admin/seo-packages-appointments/AdminSeoPackagesAppointmentDetail";

interface PageProps {
  params: Promise<{ appointment_id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { appointment_id } = await params;
  return {
    title: `SEO Appointment #${appointment_id} | Admin`,
  };
}

export default async function AdminSeoPackagesAppointmentDetailPage({ params }: PageProps) {
  const { appointment_id } = await params;
  return <AdminSeoPackagesAppointmentDetail appointment_id={Number(appointment_id)} />;
}
