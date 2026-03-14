"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import AppHeader from "@/layout/AppHeader";
import StaffSidebar from "@/layout/StaffSidebar";
import Backdrop from "@/layout/Backdrop";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { isStaff, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isStaff) {
      router.replace("/");
    }
  }, [isLoading, isStaff, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!isStaff) return null;

  const main_content_margin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  return (
    <div className="min-h-screen xl:flex bg-gray-50 dark:bg-gray-950">
      <StaffSidebar />
      <Backdrop />
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${main_content_margin}`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
