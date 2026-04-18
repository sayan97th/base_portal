import { Metadata } from "next";
import SeoPackagesPage from "@/components/seo-packages/SeoPackagesPage";

export const metadata: Metadata = {
  title: "SEO Subscription Packages | BASE",
  description: "Choose an SEO subscription plan tailored to your growth goals.",
};

export default function Page() {
  return <SeoPackagesPage />;
}
