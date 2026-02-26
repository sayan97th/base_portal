"use client";
import React, { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  GridIcon,
  DocsIcon,
  FolderIcon,
  PlugInIcon,
  ShootingStarIcon,
  PaperPlaneIcon,
  FileIcon,
  CopyIcon,
  PencilIcon,
  BoxIconLine,
  BoltIcon,
  BoxCubeIcon,
  UserCircleIcon,
  GroupIcon,
  DollarLineIcon,
  CreditCardIcon,
  ChatIcon,
  ChevronDownIcon,
  CalenderIcon,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";

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
};

type SidebarSection = {
  title?: string;
  items: SidebarItem[];
};

const sidebar_sections: SidebarSection[] = [
  {
    items: [
      { name: "Dashboard", icon: <GridIcon />, path: "/", highlight: true },
      { name: "Deliverables", icon: <DocsIcon />, path: "#" },
      { name: "Resources", icon: <FolderIcon />, path: "#" },
    ],
  },
  {
    title: "OFF PAGE PRODUCTS",
    items: [
      { name: "Link Building", icon: <PlugInIcon />, path: "/link-building" },
      { name: "Premium Mentions", icon: <ShootingStarIcon />, path: "#" },
      { name: "PR Campaigns", icon: <PaperPlaneIcon />, path: "#" },
    ],
  },
  {
    title: "ON PAGE PRODUCTS",
    items: [
      {
        name: "New Content",
        icon: <FileIcon />,
        path: "/new-content",
      },
      {
        name: "Content Refresh",
        icon: <CopyIcon />,
        path: "#",
        sub_items: [
          { name: "Content Optimizations", path: "/content-refresh/content-optimizations" },
          { name: "Content Briefs", path: "/content-refresh/content-briefs" },
        ],
      },
      {
        name: "SME Content",
        icon: <PencilIcon />,
        path: "#",
        sub_items: [
          { name: "Internal SME Content Collaboration", path: "/sme-content/internal-collaboration" },
          { name: "SME Authored Content", path: "/sme-content/authored-content" },
          { name: "SME Enhanced Content", path: "/sme-content/enhanced-content" },
        ],
      },
    ],
  },
  {
    title: "PACKAGES",
    items: [
      { name: "Growth SEO Plan", icon: <BoxIconLine />, path: "#" },
      { name: "Performance SEO Plan", icon: <BoltIcon />, path: "#" },
      { name: "Full Scale SEO Plan", icon: <BoxCubeIcon />, path: "#" },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { name: "Profile", icon: <UserCircleIcon />, path: "/profile" },
      { name: "Team", icon: <GroupIcon />, path: "/team" },
      { name: "Billing", icon: <CreditCardIcon />, path: "/billing" },
      { name: "Invoices", icon: <DollarLineIcon />, path: "/invoices" },
      { name: "Support", icon: <ChatIcon />, path: "/support" },
      { name: "Schedule a Call", icon: <CalenderIcon />, path: "/schedule-a-call" },
    ],
  },
];

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();
  const [expanded_menus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const isActive = useCallback(
    (path: string) => path === pathname,
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

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
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
        className={`py-8 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
      >
        <Link href="/" className="flex items-center gap-2">
          {showText ? (
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              BASE{" "}
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                Search Marketing
              </span>
            </span>
          ) : (
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              B
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            {sidebar_sections.map((section, section_index) => (
              <div key={section_index}>
                {section.title && showText && (
                  <h2 className="mb-4 text-xs uppercase flex leading-[20px] text-gray-400">
                    {section.title}
                  </h2>
                )}
                {section.title && !showText && (
                  <div className="mb-4 flex justify-center">
                    <div className="h-px w-6 bg-gray-200 dark:bg-gray-700" />
                  </div>
                )}
                <ul className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    const has_sub_items = item.sub_items && item.sub_items.length > 0;
                    const is_open = expanded_menus[item.name] || isSubActive(item.sub_items || []);

                    return (
                      <li key={item.name}>
                        {has_sub_items ? (
                          <>
                            <button
                              onClick={() => toggleSubmenu(item.name)}
                              className={`relative flex items-center w-full gap-3 px-3 py-2 font-medium rounded-lg text-theme-sm transition-colors ${isSubActive(item.sub_items!)
                                ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
                                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                                } ${!isExpanded && !isHovered
                                  ? "lg:justify-center"
                                  : "lg:justify-start"
                                }`}
                            >
                              <span
                                className={
                                  isSubActive(item.sub_items!)
                                    ? "text-brand-500 dark:text-brand-400"
                                    : "text-gray-500 dark:text-gray-400"
                                }
                              >
                                {item.icon}
                              </span>
                              {showText && (
                                <>
                                  <span className="flex-1 text-left">{item.name}</span>
                                  <span
                                    className={`transition-transform duration-200 ${is_open ? "rotate-180" : ""
                                      }`}
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
                                      className={`block px-3 py-1.5 text-theme-sm rounded-lg transition-colors ${isActive(sub_item.path)
                                        ? "text-brand-500 font-medium dark:text-brand-400"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/5"
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
                            className={`relative flex items-center w-full gap-3 px-3 py-2 font-medium rounded-lg text-theme-sm transition-colors ${item.highlight && isActive(item.path)
                              ? "bg-coral-500 text-white"
                              : isActive(item.path)
                                ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400"
                                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                              } ${!isExpanded && !isHovered
                                ? "lg:justify-center"
                                : "lg:justify-start"
                              }`}
                          >
                            <span
                              className={
                                item.highlight && isActive(item.path)
                                  ? "text-white"
                                  : isActive(item.path)
                                    ? "text-brand-500 dark:text-brand-400"
                                    : "text-gray-500 dark:text-gray-400"
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
        {showText ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
