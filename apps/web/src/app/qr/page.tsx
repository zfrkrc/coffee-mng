'use client';

import { useEffect, useState } from 'react';

type TableQr = {
  id: string;
  code: string;
  name: string;
  capacity: number;
  customerUrl: string;
  qrImageUrl: string;
};

export default function QrPage() {
  const [tables, setTables] = useState<TableQr[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const branch = new URLSearchParams(window.location.search).get('branch');
        const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
        const res = await fetch(`/api/customer/tables${qs}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { items: TableQr[] };
        setTables(json.items);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'QR table list failed');
      }
    }
    void load();
  }, []);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Masa QR Yonetimi</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Her masa kendi QR kodu ile siparis ekranina girer</p>
          </div>
          <a href="/kitchen" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
            Mutfak paneli
          </a>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tables.map((table) => (
            <article key={table.id} className="surface-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{table.code}</p>
              <h2 className="mt-1 text-base font-semibold">{table.name}</h2>
              <p className="text-xs text-slate-500">{table.capacity} kisi</p>

              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700">
                <img src={table.qrImageUrl} alt={`${table.name} QR`} className="h-52 w-full object-contain" />
              </div>

              <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{table.customerUrl}</p>
              <div className="mt-3 flex gap-2">
                <a
                  href={table.customerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white"
                >
                  Ac
                </a>
                <a
                  href={table.qrImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium dark:border-slate-700"
                >
                  QR indir
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
