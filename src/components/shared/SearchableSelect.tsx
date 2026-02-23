"use client";

import React, { useState, useRef, useEffect } from "react";

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
  const container_ref = useRef<HTMLDivElement>(null);
  const search_ref = useRef<HTMLInputElement>(null);

  const filtered_options = options.filter((opt) =>
    opt.toLowerCase().includes(search_term.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        container_ref.current &&
        !container_ref.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (is_open && search_ref.current) {
      search_ref.current.focus();
    }
  }, [is_open]);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div ref={container_ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!is_open)}
        className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-left text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
      >
        <span className="truncate">{value}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`ml-2 shrink-0 text-gray-500 transition-transform ${is_open ? "rotate-180" : ""}`}
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

      {label && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {label}
        </p>
      )}

      {/* Dropdown */}
      {is_open && (
        <div className="absolute left-0 top-12 z-50 w-full rounded-lg border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
          {/* Search Input */}
          <div className="border-b border-gray-200 p-2 dark:border-gray-700">
            <input
              ref={search_ref}
              type="text"
              value={search_term}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={placeholder}
              className="h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500/10 dark:border-gray-600 dark:bg-gray-800 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>

          {/* Options List */}
          <ul className="max-h-60 overflow-y-auto py-1">
            {filtered_options.length === 0 ? (
              <li className="px-4 py-2 text-sm text-gray-400 dark:text-gray-500">
                No results found
              </li>
            ) : (
              filtered_options.map((opt) => (
                <li key={opt}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      opt === value
                        ? "bg-brand-500 text-white"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                    }`}
                  >
                    {opt}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
