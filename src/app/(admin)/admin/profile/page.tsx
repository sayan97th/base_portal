import type { Metadata } from "next";
import AdminProfileForm from "@/components/admin/profile/AdminProfileForm";

export const metadata: Metadata = {
  title: "Profile | BASE Admin Portal",
  description: "Manage your admin account profile and preferences.",
};

export default function AdminProfilePage() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-8">
      <AdminProfileForm />
    </div>
  );
}
