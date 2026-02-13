interface ProgressBarProps {
  value: number;
  color?: string;
  className?: string;
}

export default function ProgressBar({
  value,
  color = "bg-coral-500",
  className,
}: ProgressBarProps) {
  return (
    <div
      className={`w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 ${className ?? ""}`}
    >
      <div
        className={`${color} h-2 rounded-full transition-all duration-300`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
