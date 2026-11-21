import styles from "./CouponUsageBoard.module.scss";

interface MoneyCellProps {
  value: string;
  /** Column name, shown above the amount when the board switches to cards on small screens. */
  label?: string;
  className?: string;
}

/** Right aligned amount that truncates instead of overflowing; the full value stays in the tooltip. */
export default function MoneyCell({ value, label, className = "" }: MoneyCellProps) {
  return (
    <div className={`${styles.cellMoney} ${className}`} data-label={label} title={value}>
      <span className={styles.moneyValue}>{value}</span>
    </div>
  );
}
