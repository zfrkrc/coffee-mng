'use client';

import { useEffect, useState } from 'react';
import { clearAuthToken, fetchMe, type AuthUser } from '../../lib/auth';

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function guard() {
      const me = await fetchMe();
      if (!me) {
        window.location.href = '/login';
        return;
      }
      if (!me.services.includes('ops-dashboard')) {
        window.location.href = '/';
        return;
      }
      setUser(me);
      setReady(true);
    }
    void guard();
  }, []);

  if (!ready) {
    return (
      <main className="min-h-screen px-4 py-8 sm:px-6">
        <section className="mx-auto max-w-xl surface-card rounded-2xl p-6">
          <p className="text-sm text-slate-500">Yetki kontrolu...</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 px-4 py-2 backdrop-blur dark:border-slate-700/70 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <p className="text-xs text-slate-500">{user?.name} · {user?.role}</p>
          <button
            onClick={() => {
              clearAuthToken();
              window.location.href = '/login';
            }}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
          >
            Cikis
          </button>
        </div>
      </header>
      {children}
    </>
  );
}
