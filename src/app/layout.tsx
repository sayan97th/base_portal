import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import 'flatpickr/dist/flatpickr.css';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { NotificationsProvider } from '@/context/NotificationsContext';
import { CartProvider } from '@/context/CartContext';
import JsonLd from '@/components/seo/JsonLd';

const outfit = Outfit({
  subsets: ['latin'],
});

const site_url = 'https://portal.basesearchmarketing.com';
const og_image_url = '/images/seo/base-og.png';

export const metadata: Metadata = {
  metadataBase: new URL(site_url),
  title: 'BASE Search Marketing | A Link Building and Content Agency',
  description:
    'BASE Search Marketing offers links and content services for SEOs who know what they need, and full SEO packages for marketers who want extra support.',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    locale: 'en_US',
    type: 'website',
    title: 'BASE Search Marketing | A Link Building and Content Agency',
    description:
      'BASE Search Marketing offers links and content services for SEOs who know what they need, and full SEO packages for marketers who want extra support.',
    url: '/',
    siteName: 'BASE Search Marketing',
    images: [
      {
        url: og_image_url,
        width: 1920,
        height: 1080,
        type: 'image/png',
        alt: 'BASE Search Marketing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [og_image_url],
  },
  icons: {
    icon: [
      { url: '/images/seo/base-icon-150.png', sizes: '150x150', type: 'image/png' },
      { url: '/images/seo/base-icon.png', type: 'image/png' },
    ],
    apple: [{ url: '/images/seo/base-icon.png', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/images/seo/grid-mountain-pink.png"
          as="image"
        />
        <JsonLd />
      </head>
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationsProvider>
              <CartProvider>
                <SidebarProvider>{children}</SidebarProvider>
              </CartProvider>
            </NotificationsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
