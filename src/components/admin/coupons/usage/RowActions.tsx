import Link from "next/link";
import styles from "./CouponUsageBoard.module.scss";

interface RowActionsProps {
  is_expanded: boolean;
  onToggle: () => void;
  open_url?: string | null;
  open_label: string;
  open_aria_label: string;
}

/** Text actions for a board row: show or hide the row details and open the related page. */
export default function RowActions({ is_expanded, onToggle, open_url, open_label, open_aria_label }: RowActionsProps) {
  return (
    <div className={styles.cellAction}>
      <button
        type="button"
        className={styles.actionButton}
        aria-expanded={is_expanded}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {is_expanded ? "Hide details" : "View details"}
      </button>
      {open_url ? (
        <Link
          href={open_url}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
          aria-label={open_aria_label}
        >
          {open_label}
        </Link>
      ) : null}
    </div>
  );
}
