import React from "react";
import SeoPackageCard from "./SeoPackageCard";
import SeoComparisonTable from "./SeoComparisonTable";
import type { SeoPackage, SeoComparisonRow } from "@/types/client/seo-packages";

interface SeoPackageGridProps {
  packages: SeoPackage[];
  comparison_rows: SeoComparisonRow[];
  selected_package_id: string | null;
  onPackageSelect: (package_id: string) => void;
}

function getFeaturesLabel(packages: SeoPackage[], index: number): string {
  if (index === 0) return "Key Includes";
  return `Everything in ${packages[index - 1].name}, plus`;
}

const SeoPackageGrid: React.FC<SeoPackageGridProps> = ({
  packages,
  comparison_rows,
  selected_package_id,
  onPackageSelect,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {packages.map((pkg, index) => (
          <SeoPackageCard
            key={pkg.id}
            package={pkg}
            is_selected={selected_package_id === pkg.id}
            onSelect={onPackageSelect}
            features_label={getFeaturesLabel(packages, index)}
            tier_index={index}
          />
        ))}
      </div>

      <SeoComparisonTable packages={packages} rows={comparison_rows} />
    </div>
  );
};

export default SeoPackageGrid;
