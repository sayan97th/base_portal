"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import AppHeader from "@/layout/AppHeader";
import AdminSidebar from "@/layout/AdminSidebar";
import Backdrop from "@/layout/Backdrop";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { AdminNotificationsProvider } from "@/context/AdminNotificationsContext";

/**
 * Pages built around wide spreadsheet style tables. They drop the usual content
 * max width so large screens can show more table columns at once.
 */
const WIDE_CONTENT_ROUTES = ["/admin/dashboard"];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isMobileOpen } = useSidebar();
  const { isStaff, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const is_wide_content = WIDE_CONTENT_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(`${route}/`)
  );

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

  // Only the pinned state moves the content. A hover peek floats over it, so the
  // spreadsheet never reflows just because the cursor touched the sidebar.
  const main_content_margin = isMobileOpen
    ? "ml-0"
    : isExpanded
    ? "lg:ml-[290px]"
    : "lg:ml-[72px]";

  return (
    <AdminNotificationsProvider>
      <div className="min-h-screen xl:flex bg-gray-50 dark:bg-gray-950">
        <AdminSidebar />
        <Backdrop />
        {/* overflow-x-clip, not overflow-x-hidden: hidden turns this wrapper into a
            scroll container, which stops the sticky AppHeader from sticking to the
            viewport and leaves a gap above the mobile sidebar once the page scrolls. */}
        <div
          className={`flex-1 min-w-0 overflow-x-clip transition-all duration-300 ease-in-out ${main_content_margin}`}
        >
          {/* Impersonation Banner — shown when a super admin is impersonating a team member */}
          <ImpersonationBanner />
          <AppHeader />
          <div
            className={`p-4 mx-auto md:p-6 ${
              is_wide_content ? "max-w-none 3xl:px-10" : "max-w-(--breakpoint-2xl)"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </AdminNotificationsProvider>
  );
}
