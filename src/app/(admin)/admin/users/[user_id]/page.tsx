import type { Metadata } from "next";
import React from "react";
import AdminUserDetailContent from "@/components/admin/users/AdminUserDetailContent";

interface AdminUserDetailPageProps {
  params: Promise<{ user_id: string }>;
}

export async function generateMetadata({ params }: AdminUserDetailPageProps): Promise<Metadata> {
  const { user_id } = await params;
  return {
    title: `User #${user_id} | BASE Admin Portal`,
    description: "View the details of a platform user.",
  };
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const { user_id } = await params;
  return <AdminUserDetailContent user_id={Number(user_id)} />;
}
