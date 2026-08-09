'use client';

import { useEffect, useState } from 'react';
import { fetchMe } from '../../lib/auth';

type RootResolve = {
  slug: string;
  domain: string;
  active: boolean;
};

export default function DomainRedirectPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function go() {
      try {
        const me = await fetchMe();
        if (me) {
          if (me.services.includes('ops-dashboard')) {
            window.location.replace('/ops');
            return;
          }
          if (me.services.includes('kitchen-board')) {
            window.location.replace('/kitchen');
            return;
          }
          if (me.services.includes('customer-order')) {
            window.location.replace('/m');
            return;
          }
        }
        const res = await fetch('/api/access/resolve-host-root', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Resolve HTTP ${res.status}`);
        const json = (await res.json()) as RootResolve;
        if (!json.active) throw new Error('Member is inactive');
        window.location.replace(`/${json.slug}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Yonlendirme hatasi');
      }
    }
    void go();
  }, []);

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h1 className="text-lg font-semibold">Yonlendiriliyor</h1>
        <p className="mt-2 text-sm text-slate-500">Uye giris sayfasina otomatik gecis yapiliyor...</p>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </section>
    </main>
  );
}
