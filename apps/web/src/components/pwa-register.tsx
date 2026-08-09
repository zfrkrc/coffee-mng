'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker. Runs only in the browser and only in
 * production — during development the worker would fight the dev server's
 * HMR. Never registers against the API (no /api interception).
 */
export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Non-fatal: PWA enhancement only.
    });
  }, []);

  return null;
}
