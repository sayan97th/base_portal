import React from "react";
import Label from "@/components/form/Label";

interface LinkBuildingOrderTitleProps {
  value: string;
  onChange: (value: string) => void;
}

const LinkBuildingOrderTitle: React.FC<LinkBuildingOrderTitleProps> = ({
  value,
  onChange,
}) => {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <Label className="mb-0">Order title</Label>
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          optional
        </span>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=""
        className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
      />
      <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        ie August links or whatever you&apos;d like to name it (Optional)
      </p>
    </div>
  );
};

export default LinkBuildingOrderTitle;
