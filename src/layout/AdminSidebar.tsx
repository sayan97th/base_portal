"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import {
  GridIcon,
  GroupIcon,
  UserCircleIcon,
  ChatIcon,
  ChevronDownIcon,
  TaskIcon,
  ListIcon,
  DollarLineIcon,
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
        name: "Invoices",
        icon: <DollarLineIcon />,
        path: "/admin/invoices",
        permission: "invoices.view",
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
