"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import {
  GridIcon,
  GroupIcon,
  UserIcon,
  UserCircleIcon,
  ChatIcon,
  ChevronDownIcon,
  TaskIcon,
  ListIcon,
  DollarLineIcon,
  BellIcon,
} from "@/icons/index";
import { useAuth } from "@/context/AuthContext";

type SubItem = {
  name: string;
  path: string;
};

type SidebarItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
  highlight?: boolean;
  sub_items?: SubItem[];
  /** If provided, item is only shown when user has this permission. */
  permission?: string;
};

type SidebarSection = {
  title?: string;
  items: SidebarItem[];
};

const admin_sidebar_sections: SidebarSection[] = [
  {
    items: [
      {
        name: "Dashboard",
        icon: <GridIcon />,
        path: "/admin/dashboard",
        highlight: true,
      },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      {
        name: "Users",
        icon: <GroupIcon />,
        path: "/admin/users",
        permission: "users.view",
      },
      {
        name: "Clients",
        icon: <UserIcon />,
        path: "/admin/clients",
        permission: "users.view",
      },
      {
        name: "Organizations",
        icon: <TaskIcon />,
        path: "/admin/organizations",
        permission: "organizations.view",
      },
      {
        name: "Orders",
        icon: <ListIcon />,
        path: "/admin/orders",
        permission: "orders.view",
      },
      {
        name: "Tracking",
        icon: (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
            />
          </svg>
        ),
        path: "/admin/tracking",
        permission: "orders.view",
      },
      {
        name: "Invoices",
        icon: <DollarLineIcon />,
        path: "/admin/invoices",
        permission: "invoices.view",
      },
      {
        name: "Services",
        icon: (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        ),
        path: "/admin/services",
        permission: "orders.view",
      },
      {
        name: "Coupons",
        icon: (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
        ),
        path: "/admin/coupons",
        permission: "orders.view",
      },
      {
        name: "News & Promos",
        icon: (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
            />
          </svg>
        ),
        path: "/admin/news",
        permission: "orders.view",
      },
      {
        name: "Resources",
        icon: (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        ),
        path: "/admin/resources",
        permission: "resources.view",
      },
      {
        name: "News Placements",
        icon: (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
            />
          </svg>
        ),
        path: "/admin/news-placements",
        permission: "orders.view",
      },
      {
        name: "SME Content",
        icon: (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
            />
          </svg>
        ),
        path: "/admin/sme-content",
        permission: "orders.view",
        sub_items: [
          { name: "Authored", path: "/admin/sme-content/authored" },
          { name: "Collaboration", path: "/admin/sme-content/collaboration" },
          { name: "Enhanced", path: "/admin/sme-content/enhanced" },
        ],
      },
    ],
  },
  {
    title: "TEAM",
    items: [
      {
        name: "Invitations",
        icon: <ChatIcon />,
        path: "/admin/invitations",
        permission: "invitations.manage",
      },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { name: "Notifications", icon: <BellIcon />, path: "/admin/notifications" },
      { name: "Profile", icon: <UserCircleIcon />, path: "/admin/profile" },
    ],
  },
];

const AdminSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { hasPermission } = useAuth();
  const pathname = usePathname();
  const [expanded_menus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const isActive = useCallback(
    (path: string) => path === pathname || pathname.startsWith(path + "/"),
    [pathname]
  );

  const isSubActive = useCallback(
    (sub_items: SubItem[]) => sub_items.some((sub) => sub.path === pathname),
    [pathname]
  );

  const toggleSubmenu = useCallback((item_name: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [item_name]: !prev[item_name],
    }));
  }, []);

  const showText = isExpanded || isHovered || isMobileOpen;

  const getVisibleItems = useCallback(
    (items: SidebarItem[]) =>
      items.filter((item) =>
        item.permission ? hasPermission(item.permission) : true
      ),
    [hasPermission]
  );

  const visible_sections = admin_sidebar_sections.filter(
    (section) => getVisibleItems(section.items).length > 0
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-gray-900 dark:bg-gray-950 text-white h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-700 dark:border-gray-800
        ${isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}
      >
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          {showText ? (
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white">
                BASE{" "}
                <span className="text-sm font-normal text-gray-400">
                  Search Marketing
                </span>
              </span>
              <span className="text-xs font-medium text-brand-400 mt-0.5 tracking-wider uppercase">
                Admin Portal
              </span>
            </div>
          ) : (
            <span className="text-xl font-bold text-white">B</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {visible_sections.map((section, section_index) => (
              <div key={section_index}>
                {section.title && showText && (
                  <h2 className="mb-4 text-xs uppercase leading-[20px] text-gray-500">
                    {section.title}
                  </h2>
                )}
                {section.title && !showText && (
                  <div className="mb-4 flex justify-center">
                    <div className="h-px w-6 bg-gray-700" />
                  </div>
                )}
                <ul className="flex flex-col gap-1">
                  {getVisibleItems(section.items).map((item) => {
                      const has_sub_items =
                        item.sub_items && item.sub_items.length > 0;
                      const is_open =
                        expanded_menus[item.name] ||
                        isSubActive(item.sub_items || []);

                      return (
                        <li key={item.name}>
                          {has_sub_items ? (
                            <>
                              <button
                                onClick={() => toggleSubmenu(item.name)}
                                className={`relative flex items-center w-full gap-3 px-3 py-2 font-medium rounded-lg text-theme-sm transition-colors ${
                                  isSubActive(item.sub_items!)
                                    ? "bg-brand-500/20 text-brand-400"
                                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                                } ${
                                  !isExpanded && !isHovered
                                    ? "lg:justify-center"
                                    : "lg:justify-start"
                                }`}
                              >
                                <span
                                  className={
                                    isSubActive(item.sub_items!)
                                      ? "text-brand-400"
                                      : "text-gray-500"
                                  }
                                >
                                  {item.icon}
                                </span>
                                {showText && (
                                  <>
                                    <span className="flex-1 text-left">{item.name}</span>
                                    <span
                                      className={`transition-transform duration-200 ${is_open ? "rotate-180" : ""}`}
                                    >
                                      <ChevronDownIcon />
                                    </span>
                                  </>
                                )}
                              </button>
                              {showText && is_open && (
                                <ul className="mt-1 ml-9 flex flex-col gap-1">
                                  {item.sub_items!.map((sub_item) => (
                                    <li key={sub_item.name}>
                                      <Link
                                        href={sub_item.path}
                                        className={`block px-3 py-1.5 text-theme-sm rounded-lg transition-colors ${
                                          isActive(sub_item.path)
                                            ? "text-brand-400 font-medium"
                                            : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                                        }`}
                                      >
                                        {sub_item.name}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </>
                          ) : (
                            <Link
                              href={item.path}
                              className={`relative flex items-center w-full gap-3 px-3 py-2 font-medium rounded-lg text-theme-sm transition-colors ${
                                item.highlight && isActive(item.path)
                                  ? "bg-brand-500 text-white"
                                  : isActive(item.path)
                                    ? "bg-white/10 text-white"
                                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                              } ${
                                !isExpanded && !isHovered
                                  ? "lg:justify-center"
                                  : "lg:justify-start"
                              }`}
                            >
                              <span
                                className={
                                  item.highlight && isActive(item.path)
                                    ? "text-white"
                                    : isActive(item.path)
                                      ? "text-brand-400"
                                      : "text-gray-500"
                                }
                              >
                                {item.icon}
                              </span>
                              {showText && <span>{item.name}</span>}
                            </Link>
                          )}
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AdminSidebar;
