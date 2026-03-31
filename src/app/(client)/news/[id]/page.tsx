import type { Metadata } from "next";
import NewsDetailPage from "@/components/news/NewsDetailPage";

export const metadata: Metadata = {
  title: "News Detail | BASE Search Marketing",
  description: "Read the full story.",
};

export default async function NewsDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NewsDetailPage post_id={id} />;
}
