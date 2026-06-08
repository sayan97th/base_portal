"use client";

import React, { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type SearchItem = {
  label: string;
  path: string;
  category: string;
};

const client_search_items: SearchItem[] = [
  { label: "Dashboard", path: "/", category: "Main" },
  { label: "Deliverables", path: "/deliverables", category: "Main" },
  { label: "Resources", path: "/resources", category: "Main" },
  { label: "Store", path: "/?tab=products", category: "Main" },
  { label: "Link Building", path: "/link-building", category: "Off Page" },
  { label: "Premium Mentions", path: "/premium-mentions", category: "Off Page" },
  { label: "New Content", path: "/new-content", category: "On Page" },
  { label: "Content Optimizations", path: "/content-refresh/content-optimizations", category: "On Page" },
  { label: "Content Briefs", path: "/content-refresh/content-briefs", category: "On Page" },
  { label: "Internal SME Collaboration", path: "/sme-content/internal-collaboration", category: "On Page" },
  { label: "SME Authored Content", path: "/sme-content/authored-content", category: "On Page" },
  { label: "SME Enhanced Content", path: "/sme-content/enhanced-content", category: "On Page" },
  { label: "SEO Packages", path: "/seo-packages", category: "Packages" },
  { label: "Profile", path: "/profile", category: "Account" },
  { label: "Orders", path: "/orders", category: "Account" },
  { label: "Billing", path: "/billing", category: "Account" },
  { label: "Invoices", path: "/invoices", category: "Account" },
  { label: "Credits", path: "/credits", category: "Account" },
  { label: "Buy Credits", path: "/credits/buy", category: "Account" },
  { label: "Support", path: "/support", category: "Account" },
  { label: "New Support Ticket", path: "/support/new", category: "Account" },
  { label: "Schedule a Call", path: "/schedule-a-call", category: "Account" },
  { label: "Notifications", path: "/notifications", category: "Account" },
];

const admin_search_items: SearchItem[] = [
  { label: "Dashboard", path: "/admin/dashboard", category: "Main" },
  { label: "Users", path: "/admin/users", category: "Management" },
  { label: "All Clients", path: "/admin/clients", category: "Management" },
  { label: "Client Invitations", path: "/admin/clients/invitations", category: "Management" },
  { label: "Organizations", path: "/admin/organizations", category: "Management" },
  { label: "Orders", path: "/admin/orders", category: "Management" },
  { label: "Tracking", path: "/admin/tracking", category: "Management" },
  { label: "Scheduled Calls", path: "/admin/scheduled-calls", category: "Management" },
  { label: "Invoices", path: "/admin/invoices", category: "Finance" },
  { label: "Create Invoice", path: "/admin/invoices/create", category: "Finance" },
  { label: "Assign Credits", path: "/admin/credits", category: "Finance" },
  { label: "Clients Credits", path: "/admin/credits/clients", category: "Finance" },
  { label: "Credit Purchases", path: "/admin/credits/purchases", category: "Finance" },
  { label: "Link Building", path: "/admin/link-building", category: "Products" },
  { label: "Premium Mentions", path: "/admin/premium-mentions", category: "Products" },
  { label: "New Content", path: "/admin/new-content", category: "Products" },
  { label: "Content Optimization", path: "/admin/content-optimization", category: "Products" },
  { label: "Content Briefs", path: "/admin/content-briefs", category: "Products" },
  { label: "SEO Packages", path: "/admin/seo-packages", category: "Products" },
  { label: "SME Content", path: "/admin/sme-content", category: "Products" },
  { label: "Coupons", path: "/admin/coupons", category: "Promotions" },
  { label: "New Coupon", path: "/admin/coupons/new", category: "Promotions" },
  { label: "Discounts", path: "/admin/discounts", category: "Promotions" },
  { label: "News & Promos", path: "/admin/news", category: "Promotions" },
  { label: "News Placements", path: "/admin/news-placements", category: "Promotions" },
  { label: "Resources", path: "/admin/resources", category: "Content" },
  { label: "New Resource", path: "/admin/resources/new", category: "Content" },
  { label: "Support Tickets", path: "/admin/support-tickets", category: "Support" },
  { label: "Teams", path: "/admin/teams", category: "Settings" },
  { label: "New Team", path: "/admin/teams/new", category: "Settings" },
  { label: "Roles", path: "/admin/roles", category: "Settings" },
  { label: "Invitations", path: "/admin/invitations", category: "Settings" },
  { label: "Notifications", path: "/admin/notifications", category: "Settings" },
  { label: "Email Settings", path: "/admin/email-notifications", category: "Settings" },
  { label: "Profile", path: "/admin/profile", category: "Account" },
];

function filterResults(query: string, items: SearchItem[]): SearchItem[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return [];
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(normalized) ||
      item.category.toLowerCase().includes(normalized)
  );
}

const GlobalSearch = forwardRef<HTMLInputElement>(function GlobalSearch(_props, ref) {
  const [query, setQuery] = useState("");
  const [is_open, setIsOpen] = useState(false);
  const [active_index, setActiveIndex] = useState(-1);
  const router = useRouter();
  const pathname = usePathname();
  const { isStaff } = useAuth();
  const container_ref = useRef<HTMLDivElement>(null);
  const results_ref = useRef<HTMLDivElement>(null);

  const search_items = isStaff ? admin_search_items : client_search_items;
  const results = filterResults(query, search_items);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  const clearAndClose = useCallback(() => {
    setQuery("");
    closeSearch();
  }, [closeSearch]);

  const navigateTo = useCallback(
    (path: string) => {
      clearAndClose();
      router.push(path);
    },
    [router, clearAndClose]
  );

  // Close dropdown on route change
  useEffect(() => {
    clearAndClose();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (container_ref.current && !container_ref.current.contains(e.target as Node)) {
        closeSearch();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeSearch]);

  // Scroll active result into view
  useEffect(() => {
    if (active_index < 0 || !results_ref.current) return;
    const active_el = results_ref.current.querySelector<HTMLElement>(
      `[data-index="${active_index}"]`
    );
    active_el?.scrollIntoView({ block: "nearest" });
  }, [active_index]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        clearAndClose();
        return;
      }
      if (!is_open || results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
      } else if (e.key === "Enter" && active_index >= 0) {
        e.preventDefault();
        navigateTo(results[active_index].path);
      }
    },
    [is_open, results, active_index, navigateTo, clearAndClose]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setActiveIndex(-1);
    setIsOpen(value.trim().length > 0);
  };

  const handleFocus = () => {
    if (query.trim().length > 0) setIsOpen(true);
  };

  const is_mac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return (
    <div ref={container_ref} className="relative w-full xl:w-[300px]">
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="relative">
          <span className="absolute -translate-y-1/2 left-4 top-1/2 pointer-events-none">
            <svg
              className="fill-gray-500 dark:fill-gray-400"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
                fill=""
              />
            </svg>
          </span>

          <input
            ref={ref}
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder="Search pages..."
            autoComplete="off"
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-16 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/3 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />

          {query ? (
            <button
              type="button"
              onClick={clearAndClose}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 pointer-events-none">
              <kbd className="flex h-5 items-center rounded border border-gray-200 bg-gray-50 px-1 text-[10px] font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
                {is_mac ? "⌘" : "Ctrl"}
              </kbd>
              <kbd className="flex h-5 items-center rounded border border-gray-200 bg-gray-50 px-1 text-[10px] font-medium text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-500">
                K
              </kbd>
            </span>
          )}
        </div>
      </form>

      {is_open && (
        <div
          ref={results_ref}
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-[99999] max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
          role="listbox"
          aria-label="Search results"
        >
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              No pages found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul className="py-1.5">
              {results.map((item, index) => (
                <li key={item.path}>
                  <button
                    type="button"
                    data-index={index}
                    role="option"
                    aria-selected={index === active_index}
                    onClick={() => navigateTo(item.path)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      index === active_index
                        ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                        : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <svg
                        className={`h-3.5 w-3.5 shrink-0 ${
                          index === active_index
                            ? "text-brand-500 dark:text-brand-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 12h18M13 6l6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="truncate font-medium">{item.label}</span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        index === active_index
                          ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
                          : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {item.category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              <kbd className="font-sans">↑↓</kbd> navigate &nbsp;&bull;&nbsp;
              <kbd className="font-sans">↵</kbd> go &nbsp;&bull;&nbsp;
              <kbd className="font-sans">Esc</kbd> close
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

export default GlobalSearch;
