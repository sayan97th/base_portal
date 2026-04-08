"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// Navigation tabs for the client profile header.
const nav_tabs = [
  { label: "OVERVIEW", href: "/" },
  { label: "PRODUCTS", href: "/link-building" },
  { label: "RESOURCES", href: "/resources" },
  { label: "TOOLS", href: "/tools" },
];

export default function ClientProfile() {
  const pathname = usePathname();
  const { user } = useAuth();

  const org_name =
    user?.organization?.name ??
    (user ? `${user.first_name} ${user.last_name}`.trim() : "Client");

  const initials = org_name
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w.charAt(0).toUpperCase())
    .join("");

  // OVERVIEW is active on the root dashboard; PRODUCTS is active on its page.
  const getIsActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      {/* Client Info Row */}
      <div className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-3">
          {/* Logo / Initials Avatar */}
          {user?.organization?.icon_light ? (
            <img
              src={user.organization.icon_light}
              alt={org_name}
              className="h-11 w-11 rounded-xl object-contain"
            />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-coral-500 text-base font-bold text-white">
              {initials || "C"}
            </span>
          )}

          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {org_name}
            </h2>
            {user?.email && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* Place Order → products overview page */}
        <Link
          href="/link-building"
          className="hidden items-center gap-2 rounded-lg bg-coral-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-coral-600 sm:flex"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 2v10M2 7h10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Place Order
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-4 flex border-b border-gray-200 px-5 dark:border-gray-800 sm:px-6">
        {nav_tabs.map((tab) => {
          const is_active = getIsActive(tab.href);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                is_active
                  ? "border-b-2 border-coral-500 text-coral-500"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
