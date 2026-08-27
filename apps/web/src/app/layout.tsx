import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { PWARegister } from '@/components/pwa-register';
import './globals.css';

export const metadata: Metadata = {
  title: 'CafeOS Edge — Kafe Yönetim Platformu',
  description: 'Offline-first kafe yönetim platformu: QR menü, masa hesap takibi, mutfak ekranı (KDS), günlük kapanış ve AI raporları.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CafeOS',
  },
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: 'CafeOS Edge — Kafe Yönetim Platformu',
    description: 'QR menü, masa hesap takibi, mutfak ekranı ve AI raporları — hepsi tek platformda.',
    type: 'website',
    locale: 'tr_TR',
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
