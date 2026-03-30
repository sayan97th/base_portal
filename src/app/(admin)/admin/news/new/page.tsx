import type { Metadata } from "next";
import NewsFormPage from "@/components/admin/news/NewsFormPage";

export const metadata: Metadata = {
  title: "New Post | News & Promos | Admin Portal",
  description: "Create a new news or promo post.",
};

export default function NewNewsPostPage() {
  return <NewsFormPage mode="create" />;
}
