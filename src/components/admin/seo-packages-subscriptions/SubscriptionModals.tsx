"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  adminSeoSubscriptionService,
  extractApiError,
} from "@/services/admin/seo-packages-subscription.service";
import type {
  AdminClientPaymentProfile,
  AdminSeoSubscription,
  AdminSeoSubscriptionDetail,
} from "@/services/admin/seo-packages-subscription.service";
import {
  cardBrandLabel,
  clientName,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  initials,
  todayIsoDate,
} from "./subscription-format";
import styles from "./SubscriptionModals.module.scss";

const NOTES_MAX_LENGTH = 1000;
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

type DialogTone = "brand" | "danger";
type DialogSize = "sm" | "md";

// ── Icons ────────────────────────────────────────────────────────────────────

function Icon({ d, stroke_width = 2 }: { d: string; stroke_width?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke_width} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

const ICON_PATHS = {
  credit_card:
    "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z",
  ban: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  close: "M6 18L18 6M6 6l12 12",
  check: "M4.5 12.75l6 6 9-13.5",
  info: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
  alert: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z",
  lock: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z",
  shield:
    "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  bolt: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
} as const;

function SpinnerIcon() {
  return (
    <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ── Shared building blocks ───────────────────────────────────────────────────

function joinClasses(...class_names: Array<string | false | null | undefined>): string {
  return class_names.filter(Boolean).join(" ");
}

function Notice({
  tone,
  children,
}: {
  tone: "info" | "warning" | "error";
  children: ReactNode;
}) {
  const icon_path = tone === "info" ? ICON_PATHS.info : ICON_PATHS.alert;
  return (
    <div
      className={joinClasses(styles.notice, styles[`notice_${tone}`])}
      role={tone === "error" ? "alert" : undefined}
    >
      <Icon d={icon_path} />
      <span>{children}</span>
    </div>
  );
}

function SubscriptionSummary({
  subscription,
  amount_caption,
  details,
}: {
  subscription: AdminSeoSubscription;
  amount_caption: string;
  details: Array<{ label: string; value: string }>;
}) {
  const name = clientName(subscription);
  return (
    <div className={styles.summary}>
      <div className={styles.summary_head}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(name)}
        </span>
        <span className={styles.summary_text}>
          <span className={styles.summary_label}>Subscription</span>
          <span className={styles.summary_name} title={name}>
            {name}
          </span>
          <span className={styles.summary_meta} title={subscription.plan_name}>
            {subscription.plan_name}
          </span>
        </span>
        <span className={styles.summary_amount}>
          <span className={styles.summary_amount_value}>{formatMoneyCompact(subscription.monthly_price)}</span>
          <span className={styles.summary_amount_caption}>{amount_caption}</span>
        </span>
      </div>
      {details.length > 0 && (
        <dl className={styles.summary_grid}>
          {details.map((detail) => (
            <div key={detail.label} className={styles.summary_cell}>
              <dt>{detail.label}</dt>
              <dd title={detail.value}>{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

// ── Dialog shell ─────────────────────────────────────────────────────────────

interface SubscriptionDialogProps {
  tone: DialogTone;
  size?: DialogSize;
  icon: ReactNode;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  is_busy: boolean;
  /** Element focused when the dialog opens. Falls back to the first focusable element. */
  initial_focus_ref?: RefObject<HTMLElement | null>;
  children: ReactNode;
  footer: ReactNode;
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * Accessible dialog used by the subscription actions.
 * Handles portal rendering, scroll lock, focus trap, focus restore and
 * Escape to close. Closing while a request is running shakes the card instead.
 */
function SubscriptionDialog(props: SubscriptionDialogProps) {
  if (typeof document === "undefined") return null;
  return createPortal(<SubscriptionDialogBody {...props} />, document.body);
}

function SubscriptionDialogBody({
  tone,
  size = "sm",
  icon,
  eyebrow,
  title,
  description,
  is_busy,
  initial_focus_ref,
  children,
  footer,
  onSubmit,
  onClose,
}: SubscriptionDialogProps) {
  const title_id = useId();
  const description_id = useId();
  const card_ref = useRef<HTMLDivElement>(null);
  const [is_shaking, setIsShaking] = useState(false);

  // Keep the latest handlers without re-running the mount effect.
  const handlers_ref = useRef({ onClose, is_busy });
  useEffect(() => {
    handlers_ref.current = { onClose, is_busy };
  }, [onClose, is_busy]);

  const requestClose = () => {
    if (is_busy) {
      setIsShaking(true);
      return;
    }
    onClose();
  };

  useEffect(() => {
    const previous_focus = document.activeElement as HTMLElement | null;
    const previous_overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const first_focusable = card_ref.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (initial_focus_ref?.current ?? first_focusable)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (handlers_ref.current.is_busy) {
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
    // Runs once per open, the ref is read at mount time on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (is_busy) {
      setIsShaking(true);
      return;
    }
    onSubmit();
  };

  return (
    <div className={joinClasses(styles.root, styles[`tone_${tone}`])}>
      <div className={styles.backdrop} aria-hidden="true" onClick={requestClose} />

      <div
        ref={card_ref}
        role={tone === "danger" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={title_id}
        aria-describedby={description ? description_id : undefined}
        aria-busy={is_busy}
        className={joinClasses(styles.card, styles[`card_${size}`], is_shaking && styles.card_shake)}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setIsShaking(false);
        }}
      >
        <button
          type="button"
          className={styles.close_button}
          onClick={requestClose}
          disabled={is_busy}
          aria-label="Close dialog"
        >
          <Icon d={ICON_PATHS.close} />
        </button>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.scroll_area}>
            <div className={styles.header}>
              <div className={styles.icon_wrap} aria-hidden="true">
                <span className={styles.icon_halo} />
                <span className={styles.icon_halo} />
                <span className={styles.icon_badge}>{icon}</span>
              </div>
              {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
              <h2 id={title_id} className={styles.title}>
                {title}
              </h2>
              {description && (
                <p id={description_id} className={styles.description}>
                  {description}
                </p>
              )}
            </div>

            <div className={styles.body}>{children}</div>
          </div>

          <div className={styles.footer}>{footer}</div>
        </form>
      </div>
    </div>
  );
}

function KeyboardHint({ show_enter = true }: { show_enter?: boolean }) {
  return (
    <p className={styles.kbd_hint} aria-hidden="true">
      Press <kbd>Esc</kbd> to close
      {show_enter && (
        <>
          , <kbd>Enter</kbd> to confirm
        </>
      )}
    </p>
  );
}

// ── Cancel subscription ──────────────────────────────────────────────────────

export function CancelSubscriptionModal({
  subscription,
  onClose,
  onCancelled,
}: {
  subscription: AdminSeoSubscription;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [is_cancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keep_ref = useRef<HTMLButtonElement>(null);
  const notes_id = useId();
  const notes_hint_id = useId();

  const notes_length = notes.length;
  const is_near_limit = notes_length >= NOTES_MAX_LENGTH * 0.9;

  const consequences: Array<{ kind: "stop" | "keep"; text: string }> = [
    { kind: "stop", text: `${clientName(subscription)} will not be charged again for this plan.` },
    { kind: "stop", text: "Any pending payment retries stop immediately." },
    { kind: "keep", text: "Past invoices and the payment history are kept." },
  ];

  async function handleConfirm() {
    setIsCancelling(true);
    setError(null);
    try {
      await adminSeoSubscriptionService.cancelSubscription(subscription.id, {
        notes: notes.trim() || undefined,
      });
      onCancelled();
    } catch (err) {
      setError(extractApiError(err, "Failed to cancel the subscription. Please try again."));
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <SubscriptionDialog
      tone="danger"
      size="sm"
      icon={<Icon d={ICON_PATHS.ban} stroke_width={1.9} />}
      title="Cancel subscription?"
      description={
        <>
          You are about to end <strong>{subscription.plan_name}</strong>. Review what happens next before
          confirming.
        </>
      }
      is_busy={is_cancelling}
      initial_focus_ref={keep_ref}
      onSubmit={handleConfirm}
      onClose={onClose}
      footer={
        <>
          <div className={styles.actions}>
            <button
              ref={keep_ref}
              type="button"
              onClick={onClose}
              disabled={is_cancelling}
              className={joinClasses(styles.button, styles.button_secondary)}
            >
              Keep active
            </button>
            <button
              type="submit"
              disabled={is_cancelling}
              className={joinClasses(styles.button, styles.button_primary)}
            >
              {is_cancelling ? <SpinnerIcon /> : <Icon d={ICON_PATHS.ban} />}
              {is_cancelling ? "Cancelling..." : "Yes, cancel"}
            </button>
          </div>
          <KeyboardHint show_enter={false} />
        </>
      }
    >
      <SubscriptionSummary
        subscription={subscription}
        amount_caption="per month"
        details={[
          { label: "Started", value: formatDate(subscription.starts_at) },
          { label: "Next charge", value: formatDate(subscription.next_billing_date) },
        ]}
      />

      <ul className={styles.consequences}>
        {consequences.map((consequence) => (
          <li key={consequence.text} className={styles.consequence}>
            <span
              className={joinClasses(
                styles.consequence_icon,
                consequence.kind === "stop" ? styles.consequence_icon_stop : styles.consequence_icon_keep
              )}
              aria-hidden="true"
            >
              <Icon d={consequence.kind === "stop" ? ICON_PATHS.close : ICON_PATHS.check} stroke_width={3} />
            </span>
            <span>{consequence.text}</span>
          </li>
        ))}
      </ul>

      <div className={styles.field}>
        <label htmlFor={notes_id} className={styles.field_label}>
          Cancellation reason
          <span className={styles.field_optional}>Optional, internal only</span>
        </label>
        <textarea
          id={notes_id}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          onKeyDown={(event) => {
            // Enter adds a new line in the textarea, Cmd or Ctrl + Enter confirms.
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={3}
          maxLength={NOTES_MAX_LENGTH}
          disabled={is_cancelling}
          placeholder="For example, the client moved to another plan."
          aria-describedby={notes_hint_id}
          className={styles.textarea}
        />
        <div id={notes_hint_id} className={styles.field_footer}>
          <span>Visible to admins only. The client is not notified of this note.</span>
          <span className={joinClasses(styles.counter, is_near_limit && styles.counter_near_limit)}>
            {notes_length}/{NOTES_MAX_LENGTH}
          </span>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <p className={styles.irreversible}>
        <Icon d={ICON_PATHS.lock} />
        This action cannot be undone.
      </p>
    </SubscriptionDialog>
  );
}
