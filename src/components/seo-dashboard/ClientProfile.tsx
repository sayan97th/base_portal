"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// Icons for each navigation tab.
function DashboardIcon({ active }: { active: boolean }) {
  const color = active ? "#EC4899" : "currentColor";
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" stroke={color} strokeWidth="1.4" />
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" stroke={color} strokeWidth="1.4" />
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" stroke={color} strokeWidth="1.4" />
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

function LinkBuildingIcon({ active }: { active: boolean }) {
  const color = active ? "#EC4899" : "currentColor";
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M8.5 6.5L6.5 8.5M9.5 4.5a2.828 2.828 0 010 4L8 10a2.828 2.828 0 01-4-4L5.5 4.5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M5.5 10.5a2.828 2.828 0 000-4L7 5a2.828 2.828 0 014 4L9.5 10.5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ResourcesIcon({ active }: { active: boolean }) {
  const color = active ? "#EC4899" : "currentColor";
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="2" y="1.5" width="11" height="12" rx="1.5" stroke={color} strokeWidth="1.4" />
      <path d="M5 5h5M5 7.5h5M5 10h3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ToolsIcon({ active }: { active: boolean }) {
  const color = active ? "#EC4899" : "currentColor";
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M12.5 2.5L10 5M10 5l1.5 1.5L13.5 4 12.5 2.5ZM10 5L5.5 9.5M5.5 9.5L4 8 1 11l2.5 2.5 3-3L5.5 9.5ZM5.5 9.5L4 11"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Navigation tab definitions.
const nav_tabs = [
  { label: "Dashboard", href: "/", icon: DashboardIcon },
  { label: "Link Building", href: "/link-building", icon: LinkBuildingIcon },
  { label: "Resources", href: "/resources", icon: ResourcesIcon },
  { label: "Tools", href: "/tools", icon: ToolsIcon },
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

  // Dashboard tab is active only on "/"; all others match by prefix.
  const getIsActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      {/* Client info row */}
      <div className="flex items-center justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-center gap-3">
          {/* Logo / initials avatar */}
          {user?.organization?.icon_light ? (
            <img
              src={user.organization.icon_light}
              alt={org_name}
              className="h-11 w-11 rounded-xl object-contain ring-1 ring-gray-100 dark:ring-white/10"
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-coral-400 to-coral-600 text-base font-bold text-white shadow-sm">
              {initials || "C"}
            </span>
          )}

          <div>
            <h2 className="text-[15px] font-semibold leading-tight text-gray-900 dark:text-white/90">
              {org_name}
            </h2>
            {user?.email && (
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* Place Order CTA */}
        <Link
          href="/link-building"
          className="hidden items-center gap-1.5 rounded-lg bg-coral-500 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-coral-600 sm:flex"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M6 1.5v9M1.5 6h9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          Place Order
        </Link>
      </div>

      {/* Navigation tabs */}
      <div className="mt-4 flex overflow-x-auto border-b border-gray-100 px-5 dark:border-gray-800 sm:px-6">
        {nav_tabs.map((tab) => {
          const is_active = getIsActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`relative flex shrink-0 items-center gap-1.5 px-3 py-3 text-[13px] font-medium transition-colors focus-visible:outline-none ${
                is_active
                  ? "text-coral-500"
                  : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              }`}
            >
              <Icon active={is_active} />
              {tab.label}
              {/* Active underline indicator */}
              {is_active && (
                <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-t-full bg-coral-500" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
