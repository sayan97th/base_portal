import type { Metadata } from "next";
import NewsFormPage from "@/components/admin/news/NewsFormPage";

export const metadata: Metadata = {
  title: "Edit Post | News & Promos | Admin Portal",
  description: "Edit an existing news or promo post.",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditNewsPostPage({ params }: Props) {
  const { id } = await params;
  return <NewsFormPage mode="edit" post_id={id} />;
}
