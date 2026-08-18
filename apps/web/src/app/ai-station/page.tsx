'use client';

import { useEffect, useState } from 'react';

type Snapshot = {
  generatedAt: string;
  summary: {
    score: number;
    status: 'good' | 'attention' | 'critical';
    message: string;
  };
  recommendations: Array<{
    id: string;
    title: string;
    detail: string;
    priority: 'high' | 'medium' | 'low';
    category: 'sales' | 'inventory' | 'operations';
  }>;
  forecasts: Array<{
    productId: string;
    productName: string;
    forecastQty: number;
    confidence: number;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costTl: number;
  };
};

export default function AiStationPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [mgmt, setMgmt] = useState<{ summary: string; source: 'ai' | 'deterministic' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/ai-station/snapshot', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Snapshot;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'AI Station unavailable');
    }
  }

  async function loadMgmt() {
    try {
      const res = await fetch('/api/ai-station/management-summary', { cache: 'no-store' });
      if (res.ok) setMgmt((await res.json()) as { summary: string; source: 'ai' | 'deterministic' });
    } catch {
      setMgmt(null);
    }
  }

  useEffect(() => {
    void load();
    void loadMgmt();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">AI Station</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Operasyon zekasi, oneri ve stok tahmini</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/ops" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">Ops panel</a>
            <button onClick={() => void load()} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">Yenile</button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {!data && !error && <p className="text-sm text-slate-500">AI snapshot bekleniyor...</p>}

        {data && (
          <>
            <section className="mb-6 rounded-2xl bg-gradient-to-r from-sky-700 to-blue-800 p-5 text-white shadow-lg shadow-black/15">
              <p className="text-xs uppercase tracking-[0.14em] text-sky-100">AI Durum Skoru</p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl font-bold">{data.summary.score}</p>
                  <p className="mt-1 text-sm text-sky-100">{data.summary.message}</p>
                </div>
                <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium uppercase tracking-wide">
                  {data.summary.status}
                </span>
              </div>
              {data.usage && (
                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                  <UsageCell title="Prompt" value={`${data.usage.promptTokens}`} />
                  <UsageCell title="Completion" value={`${data.usage.completionTokens}`} />
                  <UsageCell title="Toplam" value={`${data.usage.totalTokens}`} />
                  <UsageCell title="Tahmini TL (yerel)" value={data.usage.costTl.toFixed(4)} />
                </div>
              )}
              {data.usage && (
                <p className="mt-2 text-[11px] text-sky-100/80">
                  Token/TL değerleri yerel tahmini analitiktir — gerçek sağlayıcı maliyeti değildir.
                </p>
              )}
            </section>

            {mgmt && (
              <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Yönetici Özeti</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase ${mgmt.source === 'ai' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {mgmt.source === 'ai' ? 'AI' : 'Deterministik'}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200">{mgmt.summary}</p>
              </section>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="surface-card rounded-2xl p-4">
                <h2 className="mb-3 text-lg font-semibold">Aksiyon onerileri</h2>
                <div className="space-y-2">
                  {data.recommendations.map((r) => (
                    <article key={r.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="font-semibold">{r.title}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase ${r.priority === 'high' ? 'bg-red-100 text-red-700' : r.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {r.priority}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">{r.detail}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="surface-card rounded-2xl p-4">
                <h2 className="mb-3 text-lg font-semibold">Kisa vade tahmin</h2>
                <div className="space-y-2">
                  {data.forecasts.map((f) => (
                    <div key={f.productId} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{f.productName}</p>
                        <p className="text-xs text-slate-500">Guven: %{Math.round(f.confidence * 100)}</p>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">Onerilen hazir stok: <strong>{f.forecastQty}</strong></p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">Guncelleme: {new Date(data.generatedAt).toLocaleString('tr-TR')}</p>
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function UsageCell({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/30 bg-white/10 p-2">
      <p className="text-[11px] uppercase tracking-wide text-sky-100">{title}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}
