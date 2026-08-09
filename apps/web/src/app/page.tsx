'use client';

import { useEffect, useState } from 'react';
import type { HealthStatus } from '@cafeos/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

type CloudState = 'online' | 'offline' | 'unknown';

export default function HomePage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cloud, setCloud] = useState<CloudState>('unknown');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('cafeos-theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  async function loadHealth() {
    try {
      const res = await fetch(`${API_URL}/health/ready`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHealth((await res.json()) as HealthStatus);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'API unreachable');
      setHealth(null);
    }
  }

  useEffect(() => {
    void loadHealth();
    const t = setInterval(() => void loadHealth(), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function online() {
      setCloud('online');
    }
    function offline() {
      setCloud('offline');
    }
    setCloud(navigator.onLine ? 'online' : 'offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  const overall = health?.status ?? 'down';
  const overallColor =
    overall === 'ok'
      ? 'from-emerald-600 to-green-700'
      : overall === 'degraded'
        ? 'from-amber-500 to-orange-600'
        : 'from-rose-600 to-red-700';

  return (
    <main className="min-h-screen text-gray-900 dark:text-gray-100">
      <header className="surface-card sticky top-0 z-10 flex items-center justify-between border-b border-gray-200/60 px-6 py-4 dark:border-gray-800/70">
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="" className="h-8 w-8" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">CafeOS Edge</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Offline cafe command center</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              cloud === 'online'
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500'
                : cloud === 'offline'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                cloud === 'online' ? 'bg-brand-600' : cloud === 'offline' ? 'bg-amber-500' : 'bg-gray-400'
              }`}
            />
            {cloud === 'online' ? 'İnternet bağlı' : cloud === 'offline' ? 'Çevrimdışı' : 'Bilinmiyor'}
          </span>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-lg border border-gray-200 bg-white/70 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900/70"
            aria-label="Tema değiştir"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div
          className={`fade-up mb-8 flex items-center gap-4 rounded-2xl bg-gradient-to-r p-6 text-white shadow-lg shadow-black/10 ${overallColor}`}
        >
          <span className="text-4xl">{overall === 'ok' ? '✓' : overall === 'degraded' ? '!' : '✕'}</span>
          <div>
            <h2 className="text-xl font-bold">
              {overall === 'ok' ? 'Sistem çalışıyor' : overall === 'degraded' ? 'Sistem kısmi' : 'Sistem çevrimdışı'}
            </h2>
            <p className="text-sm opacity-90">CafeOS Edge v{health?.version ?? '0.1.0'}</p>
          </div>
        </div>

        {error && (
          <div className="fade-up mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            API&#39;ye ulaşılamadı: {error}. Bağlantı varsa sayfa 15 saniyede bir yeniden dener.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {health ? (
            Object.entries(health.components).map(([name, comp]) => (
              <div
                key={name}
                className="surface-card fade-up rounded-xl p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold capitalize">{name}</span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      comp.status === 'ok'
                        ? 'bg-brand-500'
                        : comp.status === 'degraded'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{comp.detail ?? comp.status}</p>
              </div>
            ))
          ) : (
            <p className="col-span-full text-sm text-gray-500 dark:text-gray-400">Sağlık verisi bekleniyor…</p>
          )}
        </div>

        <div className="surface-card fade-up mt-8 flex flex-col items-start justify-between gap-3 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400 sm:flex-row sm:items-center">
          <span className="font-mono text-xs sm:text-sm">API: {API_URL}</span>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/m"
              className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
            >
              Musteri ekrani
            </a>
            <a
              href="/kitchen"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Mutfak paneli
            </a>
            <a
              href="/qr"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Masa QR
            </a>
            <button
              onClick={() => void loadHealth()}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800"
            >
              Yenile
            </button>
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-gray-400 dark:text-gray-600">
          CafeOS Edge v{health?.version ?? '0.1.0'} · Uptime {formatUptime(health?.uptimeSeconds ?? 0)}
        </footer>
      </section>
    </main>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}g ${h}s`;
  if (h > 0) return `${h}s ${m}d`;
  return `${m}d`;
}
