import React from "react";
import SeoPackageCard from "./SeoPackageCard";
import type { SeoPackage } from "@/types/client/seo-packages";

interface SeoPackageGridProps {
  packages: SeoPackage[];
  selected_package_id: string | null;
  onPackageSelect: (package_id: string) => void;
}

const SeoPackageGrid: React.FC<SeoPackageGridProps> = ({
  packages,
  selected_package_id,
  onPackageSelect,
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {packages.map((pkg) => (
        <SeoPackageCard
          key={pkg.id}
          package={pkg}
          is_selected={selected_package_id === pkg.id}
          onSelect={onPackageSelect}
        />
      ))}
    </div>
  );
};

export default SeoPackageGrid;
