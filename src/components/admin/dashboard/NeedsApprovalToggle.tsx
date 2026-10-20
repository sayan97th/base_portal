import React from "react";
import styles from "./NeedsApprovalToggle.module.scss";

interface NeedsApprovalToggleProps {
  /** True while the table only shows Live orders still waiting for LB TL Approval. */
  is_active: boolean;
  /** Live orders still missing an LB TL Approval value, null while loading. */
  pending_count: number | null;
  onToggle: () => void;
}

/**
 * On / off switch for the "Needs LB TL Approval" view: Live orders that still need a
 * team lead review. The client asked for this view to stay one click away, so it
 * lives on the toolbar as a compact chip.
 */
export default function NeedsApprovalToggle({
  is_active,
  pending_count,
  onToggle,
}: NeedsApprovalToggleProps) {
  const has_pending = pending_count !== null && pending_count > 0;
  const state_class = `${is_active ? ` ${styles.is_active}` : ""}${has_pending ? ` ${styles.has_pending}` : ""}`;

  const warning_icon = (
    <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
  const count_badge = has_pending && <span className={styles.count}>{pending_count.toLocaleString()}</span>;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={is_active}
      onClick={onToggle}
      title={is_active ? "Showing Live orders that need LB TL Approval, click to show every order" : "Show Live orders that still need LB TL Approval"}
      className={`${styles.chip}${state_class}`}
    >
      {warning_icon}
      Needs LB TL Approval
      {count_badge}
      <span className={styles.switch} aria-hidden="true" />
    </button>
  );
}
