"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// ── Tab icons ─────────────────────────────────────────────────────────────────

function DashboardIcon({ active }: { active: boolean }) {
  const color = active ? "#ec3c89" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" stroke={color} strokeWidth="1.4" />
      <rect x="9"   y="1.5" width="5.5" height="5.5" rx="1.5" stroke={color} strokeWidth="1.4" />
      <rect x="1.5" y="9"   width="5.5" height="5.5" rx="1.5" stroke={color} strokeWidth="1.4" />
      <rect x="9"   y="9"   width="5.5" height="5.5" rx="1.5" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

function LinkBuildingIcon({ active }: { active: boolean }) {
  const color = active ? "#ec3c89" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M9.5 2.5a3.5 3.5 0 010 4.95L8.5 8.4"
        stroke={color} strokeWidth="1.4" strokeLinecap="round"
      />
      <path
        d="M6.5 13.5a3.5 3.5 0 010-4.95L7.5 7.6"
        stroke={color} strokeWidth="1.4" strokeLinecap="round"
      />
      <path
        d="M10 6L6 10"
        stroke={color} strokeWidth="1.4" strokeLinecap="round"
      />
    </svg>
  );
}

function ResourcesIcon({ active }: { active: boolean }) {
  const color = active ? "#ec3c89" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="1.5" width="11" height="13" rx="1.5" stroke={color} strokeWidth="1.4" />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ToolsIcon({ active }: { active: boolean }) {
  const color = active ? "#ec3c89" : "currentColor";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.5 2.5L11 5M11 5l1.5 1.5L15 4l-1.5-1.5ZM11 5L6.5 9.5M6.5 9.5L5 8 2 11l2.5 2.5L7 11l-.5-1.5ZM6.5 9.5L5 11"
        stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Navigation tabs ───────────────────────────────────────────────────────────

const nav_tabs = [
  { label: "Overview",  href: "/",              icon: DashboardIcon    },
  { label: "Products",  href: "/link-building", icon: LinkBuildingIcon },
  { label: "Resources", href: "/resources",     icon: ResourcesIcon    },
  { label: "Tools",     href: "/tools",         icon: ToolsIcon        },
];

// ── Component ─────────────────────────────────────────────────────────────────

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

  // Dashboard tab is only active on the exact root; all others match by prefix.
  const getIsActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">

      {/* Top gradient accent stripe */}
      <div className="h-[3px] bg-linear-to-r from-brand-400 via-brand-500 to-coral-500" />

      {/* ── Client info row ── */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">

        {/* Avatar + name / email */}
        <div className="flex min-w-0 items-center gap-3.5">
          {user?.organization?.icon_light ? (
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl ring-2 ring-brand-100 dark:ring-brand-500/20">
              <Image
                src={user.organization.icon_light}
                alt={org_name}
                width={44}
                height={44}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
              {initials || "C"}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-white/90">
              {org_name}
            </h2>
            {user?.email && (
              <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* Place Order CTA */}
        <Link
          href="/link-building"
          className="hidden shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-600 sm:flex"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
            <path
              d="M5.5 1v9M1 5.5h9"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            />
          </svg>
          Place Order
        </Link>
      </div>

      {/* ── Navigation tabs ── */}
      <div className="flex overflow-x-auto border-t border-gray-100 px-3 dark:border-gray-800 sm:px-4">
        {nav_tabs.map((tab) => {
          const is_active = getIsActive(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`
                relative flex shrink-0 items-center gap-2 rounded-none px-3 py-3.5
                text-[13px] font-medium transition-colors focus-visible:outline-none
                ${is_active
                  ? "text-brand-500 dark:text-brand-400"
                  : "text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                }
              `}
            >
              <Icon active={is_active} />
              {tab.label}

              {/* Active underline */}
              {is_active && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-t-full bg-brand-500 dark:bg-brand-400" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
