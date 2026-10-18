import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const brand_highlights = [
  "Link building campaigns built for SEOs",
  "New content, optimization and content briefs",
  "Full SEO packages for teams that want extra support",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900">
      {/*
        The grid owns the column order. The form column is always rendered in
        the server HTML (even while the client form is still loading), so the
        brand panel never jumps from the center to the right on first paint.
      */}
      <div className="grid min-h-screen lg:h-screen lg:grid-cols-2">
        <main className="no-scrollbar flex flex-col px-6 py-8 sm:px-10 lg:overflow-y-auto lg:px-16">
          <Link
            href="/"
            className="mx-auto mb-6 block w-full max-w-md lg:hidden"
          >
            <Image
              width={144}
              height={58}
              src="/images/logo/base-logo.png"
              alt="BASE Search Marketing"
              priority
              className="h-auto w-36 dark:rounded-lg dark:bg-white dark:px-3 dark:py-2"
            />
          </Link>
          <div className="flex w-full flex-1 flex-col justify-center">
            {children}
          </div>
        </main>

        <aside className="relative isolate hidden overflow-hidden bg-gray-950 lg:flex lg:items-center lg:justify-center">
          {/* ===== Decorative background ===== */}
          <div
            aria-hidden="true"
            className="absolute -top-32 -right-32 -z-1 h-96 w-96 rounded-full bg-brand-500/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-40 -left-24 -z-1 h-96 w-96 rounded-full bg-brand-700/20 blur-3xl"
          />
          <GridShape />

          <div className="flex max-w-sm flex-col items-center px-6 text-center">
            <Link
              href="/"
              className="mb-10 block rounded-2xl bg-white px-8 py-6 shadow-theme-xl ring-1 ring-white/10 transition-transform duration-300 hover:-translate-y-0.5"
            >
              <Image
                width={231}
                height={94}
                src="/images/logo/base-logo.png"
                alt="BASE Search Marketing"
                priority
                className="h-auto w-[200px]"
              />
            </Link>

            <h2 className="text-2xl font-semibold text-white">
              A Link Building and Content Agency
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Links and content services for SEOs who know what they need, and
              full SEO packages for marketers who want extra support.
            </p>

            <ul className="mt-8 w-full space-y-3 text-left">
              {brand_highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-sm text-gray-300 backdrop-blur-sm"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </span>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
        <ThemeTogglerTwo />
      </div>
    </div>
  );
}
