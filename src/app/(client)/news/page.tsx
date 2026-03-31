import type { Metadata } from "next";
import NewsListPage from "@/components/news/NewsListPage";

export const metadata: Metadata = {
  title: "News & Updates | BASE Search Marketing",
  description: "Stay up to date with the latest news, blog posts, tips, and promotions from BASE Search Marketing.",
};

export default function NewsPage() {
  return <NewsListPage />;
}
