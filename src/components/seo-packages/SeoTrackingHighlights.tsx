import React from "react";

const DomainRatingIcon = () => (
  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v16a2 2 0 002 2h16M7 15l3.5-4 3 2.5L19 8" />
  </svg>
);

const RankingIcon = () => (
  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 20V10m6 10V4m6 16v-7" />
  </svg>
);

const TrafficIcon = () => (
  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8m0 0h-5m5 0v5" />
  </svg>
);

const BacklinkIcon = () => (
  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 10.5l-3 3m-2.379.379a3 3 0 010-4.243l2.25-2.25a3 3 0 014.243 0m-2.243 8.243a3 3 0 004.243 0l2.25-2.25a3 3 0 000-4.243"
    />
  </svg>
);

const AiCitationIcon = () => (
  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.456-2.456L14.25 6l1.035-.259a3.375 3.375 0 002.456-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
    />
  </svg>
);

const ImpressionsIcon = () => (
  <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

interface TrackingItem {
  label: string;
  icon: React.ReactNode;
}

const TRACKING_ITEMS: TrackingItem[] = [
  { label: "Domain Rating movement", icon: <DomainRatingIcon /> },
  { label: "Keyword rankings movement", icon: <RankingIcon /> },
  { label: "Organic traffic movement", icon: <TrafficIcon /> },
  { label: "Backlinks placed & live", icon: <BacklinkIcon /> },
  { label: "AI citations & mentions", icon: <AiCitationIcon /> },
  { label: "Impressions", icon: <ImpressionsIcon /> },
];

const SeoTrackingHighlights: React.FC = () => {
  return (
    <div className="rounded-2xl border border-teal-600/20 bg-teal-50/20 p-4 dark:border-teal-600/25 dark:bg-teal-600/10 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-teal-600 dark:text-teal-300">
        What We Track &amp; Report On
      </p>
      <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {TRACKING_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal-600 shadow-theme-xs dark:bg-white/10 dark:text-teal-300">
              {item.icon}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SeoTrackingHighlights;
