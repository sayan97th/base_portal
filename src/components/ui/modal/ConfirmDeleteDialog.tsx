"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./ConfirmDeleteDialog.module.scss";

export type ConfirmDeleteVariant = "delete" | "remove";

export interface ConfirmDeleteDialogProps {
  is_open: boolean;
  /** Dialog heading, for example "Delete coupon". */
  title: string;
  /** Short supporting copy under the heading. */
  description?: ReactNode;
  /** Small uppercase label above the record name, for example "Coupon". */
  item_label?: string;
  /** Name of the record that will be deleted, shown in the preview card. */
  item_name?: string;
  /** Secondary line in the preview card (status, counts, etc). */
  item_meta?: ReactNode;
  /** Icon for the preview card. Falls back to a generic document icon. */
  item_icon?: ReactNode;
  /** Render the record name in a monospace font (codes, ids). */
  is_item_name_mono?: boolean;
  /** Extra side effects the user should be aware of. */
  consequences?: string[];
  /** When set, the user must type this exact value before confirming. */
  confirmation_text?: string;
  confirm_label?: string;
  loading_label?: string;
  variant?: ConfirmDeleteVariant;
  is_loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

// ── Icons ────────────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function UserMinusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Accessible confirmation dialog for destructive actions.
 * Handles portal rendering, scroll lock, focus trap, focus restore,
 * Escape to cancel and an optional "type to confirm" safeguard.
 */
export default function ConfirmDeleteDialog(props: ConfirmDeleteDialogProps) {
  if (!props.is_open || typeof document === "undefined") return null;
  // Mounting a fresh body on every open resets the typed text and animations.
  return createPortal(<ConfirmDeleteDialogBody {...props} />, document.body);
}

function ConfirmDeleteDialogBody({
  title,
  description,
  item_label,
  item_name,
  item_meta,
  item_icon,
  is_item_name_mono = false,
  consequences = [],
  confirmation_text,
  confirm_label,
  loading_label,
  variant = "delete",
  is_loading = false,
  onConfirm,
  onClose,
}: ConfirmDeleteDialogProps) {
  const title_id = useId();
  const description_id = useId();
  const confirm_input_id = useId();

  const card_ref = useRef<HTMLDivElement>(null);
  const cancel_ref = useRef<HTMLButtonElement>(null);
  const input_ref = useRef<HTMLInputElement>(null);

  const [typed_text, setTypedText] = useState("");
  const [is_shaking, setIsShaking] = useState(false);

  const is_remove = variant === "remove";
  const resolved_confirm_label = confirm_label ?? (is_remove ? "Remove" : "Delete");
  const resolved_loading_label = loading_label ?? (is_remove ? "Removing..." : "Deleting...");
  const requires_typing = Boolean(confirmation_text);
  const is_text_confirmed = !requires_typing || typed_text.trim() === confirmation_text;
  const can_confirm = is_text_confirmed && !is_loading;

  // Keep the latest handlers without re-running the mount effect.
  const handlers_ref = useRef({ onClose, is_loading });
  useEffect(() => {
    handlers_ref.current = { onClose, is_loading };
  }, [onClose, is_loading]);

  const triggerShake = () => setIsShaking(true);

  const requestClose = () => {
    if (is_loading) {
      triggerShake();
      return;
    }
    onClose();
  };

  // Scroll lock, initial focus, focus restore and keyboard handling.
  useEffect(() => {
    const previous_focus = document.activeElement as HTMLElement | null;
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Destructive dialogs focus the safe action first, or the input when typing is required.
    (input_ref.current ?? cancel_ref.current)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (handlers_ref.current.is_loading) {
          setIsShaking(true);
          return;
        }
        handlers_ref.current.onClose();
        return;
      }

      if (event.key !== "Tab" || !card_ref.current) return;

      const focusable_elements = Array.from(
        card_ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusable_elements.length === 0) return;

      const first_element = focusable_elements[0];
      const last_element = focusable_elements[focusable_elements.length - 1];

      if (event.shiftKey && document.activeElement === first_element) {
        event.preventDefault();
        last_element.focus();
      } else if (!event.shiftKey && document.activeElement === last_element) {
        event.preventDefault();
        first_element.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previous_overflow;
      previous_focus?.focus?.();
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!can_confirm) {
      triggerShake();
      return;
    }
    onConfirm();
  };

  const has_target = Boolean(item_name);
  const target_icon = item_icon ?? (is_remove ? <UserMinusIcon /> : <DocumentIcon />);

  return (
    <div className={styles.root}>
      <div className={styles.backdrop} aria-hidden="true" onClick={requestClose} />

      <div
        ref={card_ref}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={title_id}
        aria-describedby={description ? description_id : undefined}
        aria-busy={is_loading}
        className={`${styles.card} ${is_shaking ? styles.card_shake : ""}`}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setIsShaking(false);
        }}
      >
        <button
          type="button"
          className={styles.close_button}
          onClick={requestClose}
          disabled={is_loading}
          aria-label="Close dialog"
        >
          <CloseIcon />
        </button>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.header}>
            <div className={styles.icon_wrap} aria-hidden="true">
              <span className={styles.icon_halo} />
              <span className={styles.icon_halo} />
              <span className={styles.icon_badge}>{is_remove ? <UserMinusIcon /> : <TrashIcon />}</span>
            </div>

            <h2 id={title_id} className={styles.title}>
              {title}
            </h2>

            {description && (
              <p id={description_id} className={styles.description}>
                {description}
              </p>
            )}
          </div>

          <div className={styles.body}>
            {has_target && (
              <div className={styles.target}>
                <span className={styles.target_icon} aria-hidden="true">
                  {target_icon}
                </span>
                <span className={styles.target_text}>
                  {item_label && <span className={styles.target_label}>{item_label}</span>}
                  <span
                    className={`${styles.target_name} ${is_item_name_mono ? styles.target_name_mono : ""}`}
                    title={item_name}
                  >
                    {item_name}
                  </span>
                  {item_meta && <span className={styles.target_meta}>{item_meta}</span>}
                </span>
              </div>
            )}

            {consequences.length > 0 && (
              <ul className={styles.consequences}>
                {consequences.map((consequence) => (
                  <li key={consequence} className={styles.consequence}>
                    <AlertIcon />
                    <span>{consequence}</span>
                  </li>
                ))}
              </ul>
            )}

            {requires_typing && (
              <div className={styles.confirm_field}>
                <label htmlFor={confirm_input_id} className={styles.confirm_label}>
                  Type <code>{confirmation_text}</code> to confirm.
                </label>
                <input
                  ref={input_ref}
                  id={confirm_input_id}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={typed_text}
                  onChange={(event) => setTypedText(event.target.value)}
                  disabled={is_loading}
                  placeholder={confirmation_text}
                  className={`${styles.confirm_input} ${is_text_confirmed ? styles.confirm_input_valid : ""}`}
                />
              </div>
            )}

            {!is_remove && (
              <p className={styles.irreversible}>
                <LockIcon />
                This action is permanent and cannot be undone.
              </p>
            )}
          </div>

          <div className={styles.footer}>
            <button
              ref={cancel_ref}
              type="button"
              onClick={requestClose}
              disabled={is_loading}
              className={`${styles.button} ${styles.button_cancel}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!can_confirm}
              className={`${styles.button} ${styles.button_danger}`}
            >
              {is_loading ? <SpinnerIcon /> : is_remove ? <UserMinusIcon /> : <TrashIcon />}
              {is_loading ? resolved_loading_label : resolved_confirm_label}
            </button>
          </div>

          <p className={styles.kbd_hint} aria-hidden="true">
            Press <kbd>Esc</kbd> to cancel
            {requires_typing ? (
              <>
                , <kbd>Enter</kbd> to confirm
              </>
            ) : null}
          </p>
        </form>
      </div>
    </div>
  );
}
