import React from "react";

interface Resource {
  id: number;
  name: string;
  type: "spreadsheet" | "document" | "pdf";
}

const resources: Resource[] = [
  {
    id: 1,
    name: "February KW movement 3 month comparison",
    type: "spreadsheet",
  },
  {
    id: 2,
    name: "January review",
    type: "document",
  },
  {
    id: 3,
    name: "Signed SOW 9",
    type: "pdf",
  },
];

function ResourceIcon({ type }: { type: Resource["type"] }) {
  if (type === "spreadsheet") {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-100 dark:bg-success-500/20">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="3" width="14" height="14" rx="2" stroke="#12B76A" strokeWidth="1.5" fill="none" />
          <path d="M3 7H17M7 7V17M13 7V17" stroke="#12B76A" strokeWidth="1.2" />
        </svg>
      </span>
    );
  }
  if (type === "document") {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-light-100 dark:bg-blue-light-500/20">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="4" y="2" width="12" height="16" rx="2" stroke="#0BA5EC" strokeWidth="1.5" fill="none" />
          <path d="M7 6H13M7 9H13M7 12H10" stroke="#0BA5EC" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  // PDF
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-error-100 dark:bg-error-500/20">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="2" width="12" height="16" rx="2" stroke="#F04438" strokeWidth="1.5" fill="none" />
        <text x="6" y="13" fontSize="7" fontWeight="bold" fill="#F04438">
          PDF
        </text>
      </svg>
    </span>
  );
}

export default function ResourcesCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        Resources
      </h3>

      <div className="space-y-4">
        {resources.map((resource) => (
          <a
            key={resource.id}
            href="#"
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <ResourceIcon type={resource.type} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {resource.name}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
