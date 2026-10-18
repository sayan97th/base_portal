import GridShape from "@/components/common/GridShape";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import Image from "next/image";
import Link from "next/link";
import React from "react";

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
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 -z-1 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/10 blur-3xl"
          />
          <GridShape />

          <div className="flex max-w-xs flex-col items-center px-6 text-center">
            <Link
              href="/"
              className="mb-8 block rounded-2xl bg-white px-7 py-5 shadow-theme-xl"
            >
              {/* Copy below comes from the public BASE Search Marketing website */}
              <Image
                width={231}
                height={94}
                src="/images/logo/base-logo.png"
                alt="BASE Search Marketing"
                priority
                className="h-auto w-[180px]"
              />
            </Link>
            <h2 className="text-xl font-medium leading-snug text-white">
              Custom SEO services for search and AI visibility.
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Built for brands and agencies.
            </p>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
        <ThemeTogglerTwo />
      </div>
    </div>
  );
}
