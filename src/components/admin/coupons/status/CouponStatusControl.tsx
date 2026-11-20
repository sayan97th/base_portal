"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import type { Coupon } from "@/types/admin/coupons";
import { toggleAdminCouponStatus } from "@/services/admin/coupons.service";
import { STATUS_META, getCouponStatus, type CouponStatus } from "../list/coupon-list";
import { CheckIcon, ChevronDownIcon, CloseIcon, WarningIcon } from "../list/CouponIcons";
import styles from "./CouponStatusControl.module.scss";

// Board style status cell for a single coupon. Clicking the colored cell opens
// a label picker and the choice is saved right away through the dedicated
// status endpoint, independent from the Save Changes button and from the rest
// of the form validation. That keeps "disable this coupon now" always one
// click away, even when the form has errors.
//
// The picker is rendered in a portal so no card or scroll container can clip
// it. On desktop it opens below the cell, or above when there is no room
// below. On phones it opens as a bottom sheet with large touch targets.

type SaveState = "idle" | "saving" | "saved" | "error";

interface StatusOption {
  is_active: boolean;
  label: string;
  hint: string;
  tone: CouponStatus;
}

const STATUS_OPTIONS: StatusOption[] = [
  { is_active: true, label: "Enabled", hint: "Clients can redeem it within its dates", tone: "active" },
  { is_active: false, label: "Disabled", hint: "Paused, clients cannot redeem it", tone: "disabled" },
];

const SAVED_FEEDBACK_MS = 6000;
const MENU_OFFSET = 10;
const VIEWPORT_GAP = 12;
const ARROW_EDGE_GAP = 18;
const MOBILE_QUERY = "(max-width: 640px)";

/** Explains the effective status, which also depends on the coupon dates. */
const STATUS_DESCRIPTIONS: Record<CouponStatus, string> = {
  active: "Live. Clients can apply this coupon at checkout.",
  scheduled: "Enabled, it becomes redeemable on its start date.",
  expired: "Enabled, but its end date has passed so clients cannot use it.",
  disabled: "Paused. Clients cannot apply this coupon until it is enabled again.",
};

export interface CouponStatusControlProps {
  coupon_id: string;
  coupon_code: string;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  /** Called once the server confirmed the new status. */
  onStatusSaved: (coupon: Coupon) => void;
  /** "panel" shows the full row with description, "compact" only the status cell. */
  variant?: "panel" | "compact";
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "The status could not be updated. Please try again.";
}

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

export default function CouponStatusControl({
  coupon_id,
  coupon_code,
  is_active,
  starts_at,
  expires_at,
  onStatusSaved,
  variant = "panel",
}: CouponStatusControlProps) {
  const [is_open, setIsOpen] = useState(false);
  const [pending_value, setPendingValue] = useState<boolean | null>(null);
  const [save_state, setSaveState] = useState<SaveState>("idle");
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [undo_value, setUndoValue] = useState<boolean | null>(null);

  const is_mobile = useIsMobile();
  const root_ref = useRef<HTMLDivElement>(null);
  const trigger_ref = useRef<HTMLButtonElement>(null);
  const menu_ref = useRef<HTMLDivElement>(null);
  const option_refs = useRef<(HTMLButtonElement | null)[]>([]);
  const feedback_timer_ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menu_id = useId();
  const title_id = useId();

  const displayed_is_active = pending_value ?? is_active;
  const status = getCouponStatus({ is_active: displayed_is_active, starts_at, expires_at });
  const is_saving = save_state === "saving";

  const clearFeedbackTimer = () => {
    if (feedback_timer_ref.current) clearTimeout(feedback_timer_ref.current);
    feedback_timer_ref.current = null;
  };

  useEffect(() => clearFeedbackTimer, []);

  const closeMenu = useCallback((restore_focus = true) => {
    setIsOpen(false);
    if (restore_focus) trigger_ref.current?.focus({ preventScroll: true });
  }, []);

  /**
   * Places the floating menu next to the trigger, flipping it above the cell
   * when the space below is too small and keeping it inside the viewport.
   * Styles are written straight to the element so scrolling stays smooth.
   */
  const positionMenu = useCallback(() => {
    const trigger = trigger_ref.current;
    const menu = menu_ref.current;
    if (!trigger || !menu) return;

    const trigger_rect = trigger.getBoundingClientRect();
    const menu_width = menu.offsetWidth;
    const menu_height = menu.offsetHeight;
    const viewport_width = document.documentElement.clientWidth;
    const viewport_height = window.innerHeight;
    const top_inset = getTopInset();

    const space_below = viewport_height - trigger_rect.bottom - VIEWPORT_GAP;
    const space_above = trigger_rect.top - top_inset;
    const placement =
      space_below < menu_height + MENU_OFFSET && space_above > space_below ? "top" : "bottom";

    const top =
      placement === "bottom"
        ? trigger_rect.bottom + MENU_OFFSET
        : trigger_rect.top - MENU_OFFSET - menu_height;
    const left = clamp(
      trigger_rect.right - menu_width,
      VIEWPORT_GAP,
      viewport_width - menu_width - VIEWPORT_GAP
    );
    const arrow_left = clamp(
      trigger_rect.left + trigger_rect.width / 2 - left,
      ARROW_EDGE_GAP,
      menu_width - ARROW_EDGE_GAP
    );

    menu.style.top = `${Math.max(top_inset, top)}px`;
    menu.style.left = `${left}px`;
    menu.style.setProperty("--arrow-left", `${arrow_left}px`);
    menu.dataset.placement = placement;
    menu.dataset.ready = "true";
  }, []);

  // Desktop: keep the menu attached to the cell while the page scrolls or resizes.
  useLayoutEffect(() => {
    if (!is_open || is_mobile) return;

    positionMenu();
    window.addEventListener("scroll", positionMenu, true);
    window.addEventListener("resize", positionMenu);
    return () => {
      window.removeEventListener("scroll", positionMenu, true);
      window.removeEventListener("resize", positionMenu);
    };
  }, [is_open, is_mobile, positionMenu]);

  // Mobile: the sheet covers the page, so the page behind it must not scroll.
  useEffect(() => {
    if (!is_open || !is_mobile) return;

    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous_overflow;
    };
  }, [is_open, is_mobile]);

  // Outside click and Escape close the menu, focus moves to the current option on open.
  useEffect(() => {
    if (!is_open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (root_ref.current?.contains(target) || menu_ref.current?.contains(target)) return;
      closeMenu(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    const current_index = STATUS_OPTIONS.findIndex((option) => option.is_active === displayed_is_active);
    option_refs.current[Math.max(current_index, 0)]?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
    // Focus only when the menu opens, not on every status change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [is_open, closeMenu]);

  const saveStatus = async (next_is_active: boolean, is_undo = false) => {
    if (is_saving) return;

    const previous_is_active = displayed_is_active;
    clearFeedbackTimer();
    setPendingValue(next_is_active);
    setSaveState("saving");
    setErrorMessage(null);

    try {
      const coupon = await toggleAdminCouponStatus(coupon_id, next_is_active);
      onStatusSaved(coupon);
      setUndoValue(is_undo ? null : previous_is_active);
      setSaveState("saved");
      feedback_timer_ref.current = setTimeout(() => {
        setSaveState("idle");
        setUndoValue(null);
      }, SAVED_FEEDBACK_MS);
    } catch (error) {
      setSaveState("error");
      setErrorMessage(getErrorMessage(error));
      setUndoValue(null);
    } finally {
      setPendingValue(null);
    }
  };

  const handleSelect = (option: StatusOption) => {
    closeMenu();
    if (option.is_active !== displayed_is_active) saveStatus(option.is_active);
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const focused_index = option_refs.current.findIndex((el) => el === document.activeElement);
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
        const is_current = option.is_active === displayed_is_active;
        return (
          <button
            key={option.label}
            ref={(el) => {
              option_refs.current[index] = el;
            }}
            type="button"
            role="menuitemradio"
            aria-checked={is_current}
            className={`${styles.menuOption} ${styles[`tone_${option.tone}`]} ${
              is_current ? styles.menuOptionCurrent : ""
            }`}
            onClick={() => handleSelect(option)}
          >
            <span className={styles.menuOptionText}>
              <span className={styles.menuOptionLabel}>{option.label}</span>
              {show_hints && <span className={styles.menuOptionHint}>{option.hint}</span>}
            </span>
            {is_current && <CheckIcon className={styles.menuOptionCheck} />}
          </button>
        );
      })}
    </div>
  );

  const renderMenu = () => {
    if (!is_open || typeof document === "undefined") return null;

    if (is_mobile) {
      return createPortal(
        <div className={styles.sheetLayer}>
          <div className={styles.sheetBackdrop} aria-hidden="true" />
          <div
            ref={menu_ref}
            id={menu_id}
            role="menu"
            aria-labelledby={title_id}
            className={styles.sheet}
            onKeyDown={handleMenuKeyDown}
          >
            <span className={styles.sheetHandle} aria-hidden="true" />
            <div className={styles.sheetHeader}>
              <div className={styles.sheetHeading}>
                <p id={title_id} className={styles.sheetTitle}>Coupon status</p>
                <p className={styles.sheetCode}>{coupon_code}</p>
              </div>
              <button
                type="button"
                className={styles.sheetClose}
                aria-label="Close"
                onClick={() => closeMenu()}
              >
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
        id={menu_id}
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
  };

  const status_cell = (
    <div ref={root_ref} className={styles.cellWrap}>
      <button
        ref={trigger_ref}
        type="button"
        className={`${styles.cell} ${styles[`tone_${status}`]} ${variant === "compact" ? styles.cellCompact : ""}`}
        aria-haspopup="menu"
        aria-expanded={is_open}
        aria-controls={is_open ? menu_id : undefined}
        aria-label={`Status of ${coupon_code}: ${STATUS_META[status].label}. Change status`}
        aria-busy={is_saving}
        disabled={is_saving}
        onClick={() => (is_open ? closeMenu(false) : setIsOpen(true))}
      >
        <span className={styles.cellLabel}>
          {is_saving ? <span className={styles.spinner} aria-hidden="true" /> : null}
          {STATUS_META[status].label}
        </span>
        <ChevronDownIcon className={styles.cellCaret} />
        <span className={styles.cellFold} aria-hidden="true" />
      </button>
      {renderMenu()}
    </div>
  );

  const feedback = (
    <div className={styles.feedback} aria-live="polite">
      {save_state === "saving" && <span className={styles.feedbackMuted}>Saving...</span>}
      {save_state === "saved" && (
        <span className={styles.feedbackSaved}>
          <CheckIcon className={styles.feedbackIcon} />
          {is_active ? "Coupon enabled" : "Coupon disabled"}
          {undo_value !== null && (
            <button type="button" className={styles.undoButton} onClick={() => saveStatus(undo_value, true)}>
              Undo
            </button>
          )}
        </span>
      )}
      {save_state === "error" && (
        <span className={styles.feedbackError} role="alert">
          <WarningIcon className={styles.feedbackIcon} />
          {error_message}
        </span>
      )}
    </div>
  );

  if (variant === "compact") {
    return (
      <div className={styles.compact}>
        {status_cell}
        {save_state !== "idle" && feedback}
      </div>
    );
  }

  return (
    <div className={styles.panel} style={{ "--status-color": STATUS_META[status].color } as React.CSSProperties}>
      <div className={styles.panelText}>
        <p className={styles.panelTitle}>
          <span className={styles.panelDot} aria-hidden="true" />
          {STATUS_META[status].label}
        </p>
        <p className={styles.panelDescription}>{STATUS_DESCRIPTIONS[status]}</p>
        {feedback}
      </div>
      {status_cell}
    </div>
  );
}
