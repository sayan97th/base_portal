import type { Metadata } from "next";
import AdminNewsContent from "@/components/admin/news/AdminNewsContent";

export const metadata: Metadata = {
  title: "News & Promos | Admin Portal",
  description: "Manage promotional banners, news updates, blog posts, and tips.",
};

export default function AdminNewsPage() {
  return <AdminNewsContent />;
}
