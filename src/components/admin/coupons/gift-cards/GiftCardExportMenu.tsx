"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import type { AdminGiftCardClaim } from "@/types/admin/coupons";
import styles from "./GiftCardExportMenu.module.scss";
import { exportGiftCardClaims, type GiftCardExportFormat } from "./gift-card-claims";

export interface GiftCardExportScope {
  key: string;
  label: string;
  description?: string;
  count: number;
  /** Suffix added to the file name, for example "selected". */
  file_suffix?: string;
  /** Returns the rows to export. Can be async to load the full list first. */
  getClaims: () => AdminGiftCardClaim[] | Promise<AdminGiftCardClaim[]>;
}

interface GiftCardExportMenuProps {
  coupon_code: string;
  scopes: GiftCardExportScope[];
  /** "button" matches the hero buttons, "compact" fits the embedded card. */
  variant?: "button" | "compact";
  align?: "left" | "right";
}

const FORMAT_OPTIONS: { format: GiftCardExportFormat; label: string; extension: string }[] = [
  { format: "xlsx", label: "Excel", extension: ".xlsx" },
  { format: "csv", label: "CSV", extension: ".csv" },
];

function DownloadIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

/**
 * Export dropdown for gift card requests: pick what to export (all, the
 * current view or the selected rows) and download it as Excel or CSV.
 */
export default function GiftCardExportMenu({
  coupon_code,
  scopes,
  variant = "button",
  align = "right",
}: GiftCardExportMenuProps) {
  const [is_open, setIsOpen] = useState(false);
  const [scope_key, setScopeKey] = useState(scopes[0]?.key ?? "");
  const [exporting_format, setExportingFormat] = useState<GiftCardExportFormat | null>(null);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const wrapper_ref = useRef<HTMLDivElement>(null);
  const menu_id = useId();

  const available_scopes = scopes.filter((scope) => scope.count > 0);
  const active_scope = available_scopes.find((scope) => scope.key === scope_key) ?? available_scopes[0];
  const total_available = available_scopes.length;

  useEffect(() => {
    if (!is_open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapper_ref.current && !wrapper_ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [is_open]);

  const handleExport = async (format: GiftCardExportFormat) => {
    if (!active_scope) return;
    setExportingFormat(format);
    setErrorMessage(null);
    try {
      const claims = await active_scope.getClaims();
      await exportGiftCardClaims(claims, coupon_code, format, active_scope.file_suffix);
      setIsOpen(false);
    } catch {
      setErrorMessage("The export failed. Please try again.");
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div ref={wrapper_ref} className={styles.wrapper}>
      <button
        type="button"
        className={`${styles.trigger} ${variant === "compact" ? styles.triggerCompact : ""} ${is_open ? styles.triggerOpen : ""}`}
        onClick={() => setIsOpen((value) => !value)}
        disabled={total_available === 0}
        aria-haspopup="dialog"
        aria-expanded={is_open}
        aria-controls={menu_id}
        title={total_available === 0 ? "There is nothing to export yet" : "Export gift card requests"}
      >
        <DownloadIcon />
        Export
      </button>

      {is_open && active_scope && (
        <div id={menu_id} role="dialog" aria-label="Export gift card requests" className={`${styles.menu} ${align === "left" ? styles.menuLeft : ""}`}>
          <div className={styles.menuHeader}>
            <span className={styles.menuIcon}>
              <FileIcon />
            </span>
            <div>
              <p className={styles.menuTitle}>Export requests</p>
              <p className={styles.menuSubtitle}>Choose the rows and the file format.</p>
            </div>
          </div>

          <div className={styles.scopeList} role="radiogroup" aria-label="Rows to export">
            {available_scopes.map((scope) => {
              const is_active = scope.key === active_scope.key;
              return (
                <button
                  key={scope.key}
                  type="button"
                  role="radio"
                  aria-checked={is_active}
                  className={`${styles.scope} ${is_active ? styles.scopeActive : ""}`}
                  onClick={() => setScopeKey(scope.key)}
                >
                  <span className={styles.radio} />
                  <span className={styles.scopeText}>
                    <span className={styles.scopeLabel}>{scope.label}</span>
                    {scope.description && <span className={styles.scopeDescription}>{scope.description}</span>}
                  </span>
                  <span className={styles.scopeCount}>{scope.count}</span>
                </button>
              );
            })}
          </div>

          <div className={styles.formats}>
            {FORMAT_OPTIONS.map((option) => (
              <button
                key={option.format}
                type="button"
                className={`${styles.formatButton} ${option.format === "xlsx" ? styles.formatPrimary : ""}`}
                onClick={() => handleExport(option.format)}
                disabled={exporting_format !== null}
              >
                {exporting_format === option.format ? "Preparing..." : option.label}
                <span className={styles.formatExtension}>{option.extension}</span>
              </button>
            ))}
          </div>

          {error_message && <p className={styles.error}>{error_message}</p>}
        </div>
      )}
    </div>
  );
}
