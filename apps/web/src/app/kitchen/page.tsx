'use client';

import { useEffect, useMemo, useState } from 'react';
import { authFetch } from '../../lib/auth';

type OrderStatus = 'received' | 'preparing' | 'ready';

type KitchenOrder = {
  id: string;
  tableCode: string;
  tableName: string;
  status: OrderStatus;
  items: Array<{ name: string; quantity: number }>;
  totalCents: number;
  createdAt: string;
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchSlug, setBranchSlug] = useState<string | null>(null);
  const branchQuery = branchSlug ? `?branch=${encodeURIComponent(branchSlug)}` : '';

  useEffect(() => {
    setBranchSlug(new URLSearchParams(window.location.search).get('branch'));
  }, []);

  async function loadOrders() {
    try {
      const branch = new URLSearchParams(window.location.search).get('branch');
      const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
      const res = await authFetch(`/api/customer/kitchen/orders${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { items: KitchenOrder[] };
      setOrders(json.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kitchen list unavailable');
    } finally {
      setLoading(false);
    }
  }

  async function advanceOrder(orderId: string) {
    const branch = new URLSearchParams(window.location.search).get('branch');
    const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
    await authFetch(`/api/customer/kitchen/orders/${orderId}/advance${qs}`, { method: 'POST' });
    await loadOrders();
  }

  useEffect(() => {
    void loadOrders();
    const t = setInterval(() => void loadOrders(), 3000);
    return () => clearInterval(t);
  }, []);

  const grouped = useMemo(
    () => ({
      received: orders.filter((o) => o.status === 'received'),
      preparing: orders.filter((o) => o.status === 'preparing'),
      ready: orders.filter((o) => o.status === 'ready'),
    }),
    [orders],
  );

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Mutfak Ekrani</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Canli siparis akis paneli</p>
          </div>
          <div className="flex items-center gap-2">
            <a href={`/qr${branchQuery}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
              Masa QR
            </a>
            <a href={`/ops${branchQuery}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
              Isletme
            </a>
            <button onClick={() => void loadOrders()} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
              Yenile
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading && <p className="mb-4 text-sm text-slate-500">Yukleniyor...</p>}

        <div className="grid gap-4 lg:grid-cols-3">
          <StageColumn title="Yeni" accent="bg-sky-600" items={grouped.received} onAdvance={advanceOrder} />
          <StageColumn title="Hazirlaniyor" accent="bg-amber-600" items={grouped.preparing} onAdvance={advanceOrder} />
          <StageColumn title="Hazir" accent="bg-emerald-700" items={grouped.ready} onAdvance={advanceOrder} />
        </div>
      </section>
    </main>
  );
}

function StageColumn({
  title,
  accent,
  items,
  onAdvance,
}: {
  title: string;
  accent: string;
  items: KitchenOrder[];
  onAdvance: (orderId: string) => Promise<void>;
}) {
  return (
    <section className="surface-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{title}</h2>
        <span className={`h-2.5 w-2.5 rounded-full ${accent}`} />
      </div>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-slate-500">Bos</p>}
        {items.map((order) => (
          <article key={order.id} className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/70">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{order.tableName}</p>
              <p className="text-xs text-slate-500">#{order.id.slice(0, 8)}</p>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {order.items.map((item, idx) => (
                <li key={`${order.id}-${idx}`}>
                  {item.quantity}x {item.name}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500">{Math.round(order.totalCents / 100)} TL</span>
              {order.status !== 'ready' && (
                <button
                  onClick={() => void onAdvance(order.id)}
                  className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                >
                  Ilerle
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
