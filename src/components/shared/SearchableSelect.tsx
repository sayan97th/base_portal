"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface SearchableSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  options,
  onChange,
  label,
  placeholder = "Search...",
}) => {
  const [is_open, setIsOpen] = useState(false);
  const [search_term, setSearchTerm] = useState("");
  const [dropdown_rect, setDropdownRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const trigger_ref = useRef<HTMLButtonElement>(null);
  const search_ref = useRef<HTMLInputElement>(null);
  const portal_ref = useRef<HTMLDivElement>(null);

  const filtered_options = options.filter((opt) =>
    opt.toLowerCase().includes(search_term.toLowerCase())
  );

  const updatePosition = useCallback(() => {
    if (trigger_ref.current) {
      const rect = trigger_ref.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  // Close on outside click — includes portal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const in_trigger = trigger_ref.current?.contains(target);
      const in_portal = portal_ref.current?.contains(target);
      if (!in_trigger && !in_portal) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (is_open && search_ref.current) {
      search_ref.current.focus();
    }
  }, [is_open]);

  // Reposition on scroll / resize while open
  useEffect(() => {
    if (!is_open) return;
    const handleUpdate = () => updatePosition();
    window.addEventListener("scroll", handleUpdate, { capture: true, passive: true });
    window.addEventListener("resize", handleUpdate, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [is_open, updatePosition]);

  const handleToggle = () => {
    if (!is_open) updatePosition();
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative">
      {/* Label above — matches the rest of the form */}
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        ref={trigger_ref}
        type="button"
        onClick={handleToggle}
        className={`flex h-11 w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition-all focus:outline-none focus:ring-2 ${
          is_open
            ? "border-brand-500 bg-white ring-2 ring-brand-500/20 dark:border-brand-400 dark:bg-white/5"
            : "border-gray-200 bg-gray-50 text-gray-900 dark:border-gray-700 dark:bg-white/5 dark:text-white/90"
        }`}
      >
        <span className={`truncate ${!value ? "text-gray-400" : ""}`}>
          {value || "Select..."}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`ml-2 shrink-0 text-gray-500 transition-transform duration-200 ${
            is_open ? "rotate-180" : ""
          }`}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Portal dropdown — rendered in document.body to escape any overflow:hidden parent */}
      {is_open &&
        dropdown_rect &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={portal_ref}
            style={{
              position: "absolute",
              top: dropdown_rect.top,
              left: dropdown_rect.left,
              width: dropdown_rect.width,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            {/* Search input */}
            <div className="border-b border-gray-100 p-2 dark:border-gray-800">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:border-gray-700 dark:bg-gray-800">
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <input
                  ref={search_ref}
                  type="text"
                  value={search_term}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={placeholder}
                  className="h-9 w-full bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none dark:text-white/90 dark:placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Options list */}
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered_options.length === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
                  No results found
                </li>
              ) : (
                filtered_options.map((opt) => (
                  <li key={opt}>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt)}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors ${
                        opt === value
                          ? "bg-brand-500 font-medium text-white"
                          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                      }`}
                    >
                      <span>{opt}</span>
                      {opt === value && (
                        <svg
                          className="h-3.5 w-3.5 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m4.5 12.75 6 6 9-13.5"
                          />
                        </svg>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
};

export default SearchableSelect;
