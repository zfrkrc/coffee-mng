import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { PWARegister } from '@/components/pwa-register';
import './globals.css';

export const metadata: Metadata = {
  title: 'CafeOS Edge',
  description: 'Offline-first cafe management platform',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CafeOS',
  },
  icons: {
    icon: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
