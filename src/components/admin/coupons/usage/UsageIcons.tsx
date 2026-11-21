import styles from "./CouponUsageBoard.module.scss";

export function ChevronIcon({ is_open }: { is_open: boolean }) {
  return (
    <svg
      className={`${styles.chevron} ${is_open ? styles.chevronOpen : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
