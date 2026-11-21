"use client";

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { AdminGiftCardClaim, GiftCardClaimStatus } from "@/types/admin/coupons";
import { formatMoney } from "../usage/coupon-usage";
import { GIFT_CARD_STATUS_META } from "./gift-card-claims";
import styles from "./GiftCardStatusMenu.module.scss";

// Status picker of a gift card request. Same design as the coupon status
// control on the coupon edit page: a popover of solid colored labels with an
// arrow pointing at the cell on desktop, and a bottom sheet with large touch
// targets on phones. Rendered in a portal so the board scroller never clips it.

interface StatusOption {
  status: GiftCardClaimStatus;
  hint: string;
}

/** Statuses an admin can pick. "Waiting for client" is set by the client only. */
const STATUS_OPTIONS: StatusOption[] = [
  { status: "submitted", hint: "Not delivered yet, still to send" },
  { status: "fulfilled", hint: "The client already got the gift card" },
];

const MENU_OFFSET = 10;
const VIEWPORT_GAP = 12;
const ARROW_EDGE_GAP = 18;
const MOBILE_QUERY = "(max-width: 640px)";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Bottom edge of the sticky app header, the menu must never open behind it. */
function getTopInset(): number {
  const header = document.querySelector("header");
  if (!header || getComputedStyle(header).position !== "sticky") return VIEWPORT_GAP;
  return Math.max(header.getBoundingClientRect().bottom, 0) + VIEWPORT_GAP;
}

function subscribeToMobileQuery(callback: () => void): () => void {
  const media_query = window.matchMedia(MOBILE_QUERY);
  media_query.addEventListener("change", callback);
  return () => media_query.removeEventListener("change", callback);
}

function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeToMobileQuery,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

interface GiftCardStatusMenuProps {
  claim: AdminGiftCardClaim;
  /** The status cell that opened the menu, used for placement and focus. */
  anchor: HTMLElement;
  onSelect: (status: GiftCardClaimStatus) => void;
  onClose: () => void;
}

export default function GiftCardStatusMenu({ claim, anchor, onSelect, onClose }: GiftCardStatusMenuProps) {
  const is_mobile = useIsMobile();
  const menu_ref = useRef<HTMLDivElement>(null);
  const option_refs = useRef<(HTMLButtonElement | null)[]>([]);
  const on_close_ref = useRef(onClose);
  const title_id = useId();

  useEffect(() => {
    on_close_ref.current = onClose;
  }, [onClose]);

  const closeMenu = useCallback(
    (restore_focus = true) => {
      on_close_ref.current();
      if (restore_focus) anchor.focus({ preventScroll: true });
    },
    [anchor]
  );

  /**
   * Places the popover below the cell, or above it when the space below is
   * too small, keeping it inside the viewport. Styles are written straight
   * to the element so scrolling stays smooth.
   */
  const positionMenu = useCallback(() => {
    const menu = menu_ref.current;
    if (!menu) return;

    const anchor_rect = anchor.getBoundingClientRect();
    const menu_width = menu.offsetWidth;
    const menu_height = menu.offsetHeight;
    const viewport_width = document.documentElement.clientWidth;
    const viewport_height = window.innerHeight;
    const top_inset = getTopInset();

    const space_below = viewport_height - anchor_rect.bottom - VIEWPORT_GAP;
    const space_above = anchor_rect.top - top_inset;
    const placement = space_below < menu_height + MENU_OFFSET && space_above > space_below ? "top" : "bottom";

    const top = placement === "bottom" ? anchor_rect.bottom + MENU_OFFSET : anchor_rect.top - MENU_OFFSET - menu_height;
    const left = clamp(
      anchor_rect.left + anchor_rect.width / 2 - menu_width / 2,
      VIEWPORT_GAP,
      viewport_width - menu_width - VIEWPORT_GAP
    );
    const arrow_left = clamp(anchor_rect.left + anchor_rect.width / 2 - left, ARROW_EDGE_GAP, menu_width - ARROW_EDGE_GAP);

    menu.style.top = `${Math.max(top_inset, top)}px`;
    menu.style.left = `${left}px`;
    menu.style.setProperty("--arrow-left", `${arrow_left}px`);
    menu.dataset.placement = placement;
    menu.dataset.ready = "true";
  }, [anchor]);

  // Desktop: keep the popover attached to the cell while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (is_mobile) return;

    positionMenu();
    window.addEventListener("scroll", positionMenu, true);
    window.addEventListener("resize", positionMenu);
    return () => {
      window.removeEventListener("scroll", positionMenu, true);
      window.removeEventListener("resize", positionMenu);
    };
  }, [is_mobile, positionMenu]);

  // Mobile: the sheet covers the page, so the page behind it must not scroll.
  useEffect(() => {
    if (!is_mobile) return;

    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous_overflow;
    };
  }, [is_mobile]);

  // Outside click and Escape close the menu, focus moves to the current option on open.
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      // Clicks on the cell that opened the menu are handled by the cell itself.
      if (anchor.contains(target) || menu_ref.current?.contains(target)) return;
      closeMenu(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    const current_index = STATUS_OPTIONS.findIndex((option) => option.status === claim.status);
    option_refs.current[Math.max(current_index, 0)]?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // Focus only when the menu opens, not on every status change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, closeMenu]);

  const handleSelect = (status: GiftCardClaimStatus) => {
    closeMenu();
    onSelect(status);
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const focused_index = option_refs.current.findIndex((element) => element === document.activeElement);
    const last_index = STATUS_OPTIONS.length - 1;

    if (event.key === "Tab") {
      event.preventDefault();
      closeMenu();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      option_refs.current[focused_index >= last_index ? 0 : focused_index + 1]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      option_refs.current[focused_index <= 0 ? last_index : focused_index - 1]?.focus();
    }
  };

  const renderOptions = (show_hints: boolean) => (
    <div className={styles.menuOptions}>
      {STATUS_OPTIONS.map((option, index) => {
        const meta = GIFT_CARD_STATUS_META[option.status];
        const is_current = option.status === claim.status;
        return (
          <button
            key={option.status}
            ref={(element) => {
              option_refs.current[index] = element;
            }}
            type="button"
            role="menuitemradio"
            aria-checked={is_current}
            className={`${styles.menuOption} ${is_current ? styles.menuOptionCurrent : ""}`}
            style={{ "--tone": meta.color } as React.CSSProperties}
            onClick={() => handleSelect(option.status)}
          >
            <span className={styles.menuOptionText}>
              <span className={styles.menuOptionLabel}>{meta.label}</span>
              {show_hints && <span className={styles.menuOptionHint}>{option.hint}</span>}
            </span>
            {is_current && <CheckIcon className={styles.menuOptionCheck} />}
          </button>
        );
      })}
    </div>
  );

  if (typeof document === "undefined") return null;

  if (is_mobile) {
    return createPortal(
      <div className={styles.sheetLayer}>
        <div className={styles.sheetBackdrop} aria-hidden="true" />
        <div
          ref={menu_ref}
          role="menu"
          aria-labelledby={title_id}
          className={styles.sheet}
          onKeyDown={handleMenuKeyDown}
        >
          <span className={styles.sheetHandle} aria-hidden="true" />
          <div className={styles.sheetHeader}>
            <div className={styles.sheetHeading}>
              <p id={title_id} className={styles.sheetTitle}>Gift card status</p>
              <p className={styles.sheetMeta}>
                {claim.client?.name ?? "Unknown client"}, {formatMoney(claim.reward_amount)}
                {claim.gift_card_brand_label ? ` ${claim.gift_card_brand_label}` : ""}
              </p>
            </div>
            <button type="button" className={styles.sheetClose} aria-label="Close" onClick={() => closeMenu()}>
              <CloseIcon />
            </button>
          </div>
          {renderOptions(true)}
          <p className={styles.menuHint}>Changes are saved instantly.</p>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      ref={menu_ref}
      role="menu"
      aria-labelledby={title_id}
      className={styles.menu}
      onKeyDown={handleMenuKeyDown}
    >
      <p id={title_id} className={styles.menuTitle}>Set status</p>
      {renderOptions(false)}
      <p className={styles.menuHint}>Changes are saved instantly.</p>
    </div>,
    document.body
  );
}
