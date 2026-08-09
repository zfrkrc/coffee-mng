'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchMe } from '../../lib/auth';

type MenuItem = {
  id: string;
  name: string;
  category: 'coffee' | 'tea' | 'food' | 'dessert';
  price: number;
  note: string;
  imageUrl?: string;
};

type CartLine = { item: MenuItem; qty: number };
type OrderState = 'idle' | 'received' | 'preparing' | 'ready';

type ApiMenuResponse = {
  items: Array<{
    id: string;
    name: string;
    category: MenuItem['category'];
    priceCents: number;
    note: string;
    imageUrl?: string;
  }>;
};

type ApiTablesResponse = {
  items: Array<{
    id: string;
    code: string;
    name: string;
    capacity: number;
    customerUrl: string;
    qrImageUrl: string;
  }>;
};

type ApiOrderResponse = {
  id: string;
  status: 'received' | 'preparing' | 'ready';
  tableName: string;
  totalCents: number;
};

const MENU_FALLBACK_IMAGE = '/menu-placeholder.svg';

const CATEGORY_LABEL: Record<MenuItem['category'], string> = {
  coffee: 'Kahve',
  tea: 'Çay',
  food: 'Yiyecek',
  dessert: 'Tatlı',
};

export default function CustomerPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<ApiTablesResponse['items']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<'all' | MenuItem['category']>('all');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderState, setOrderState] = useState<OrderState>('idle');
  const [tableCode, setTableCode] = useState('T6');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showLoginHint, setShowLoginHint] = useState(false);

  useEffect(() => {
    void fetchMe().then((me) => {
      if (!me) return;
      if (!me.services.includes('customer-order')) setShowLoginHint(true);
    });
  }, []);

  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get('table')?.toUpperCase();
    if (fromQuery) setTableCode(fromQuery);
  }, []);

  useEffect(() => {
    async function loadMenu() {
      setLoading(true);
      try {
        const branch = new URLSearchParams(window.location.search).get('branch');
        const qs = branch ? `&branch=${encodeURIComponent(branch)}` : '';
        const [menuRes, tableRes] = await Promise.all([
          fetch(`/api/customer/menu?${qs.startsWith('&') ? qs.slice(1) : ''}`, { cache: 'no-store' }),
          fetch(`/api/customer/tables?${qs.startsWith('&') ? qs.slice(1) : ''}`, { cache: 'no-store' }),
        ]);
        if (!menuRes.ok) throw new Error(`Menu HTTP ${menuRes.status}`);
        if (!tableRes.ok) throw new Error(`Table HTTP ${tableRes.status}`);

        const json = (await menuRes.json()) as ApiMenuResponse;
        const tableJson = (await tableRes.json()) as ApiTablesResponse;
        const mapped = json.items.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          price: Math.round(item.priceCents / 100),
          note: item.note,
          imageUrl: item.imageUrl,
        }));
        setMenu(mapped);
        setTables(tableJson.items);
        if (!tableJson.items.some((x) => x.code === tableCode)) {
          setTableCode(tableJson.items[0]?.code ?? 'T1');
        }
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Menu unavailable');
      } finally {
        setLoading(false);
      }
    }
    void loadMenu();
  }, [tableCode]);

  useEffect(() => {
    if (!orderId) return;
    const poll = setInterval(async () => {
      try {
        const branch = new URLSearchParams(window.location.search).get('branch');
        const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
        const res = await fetch(`/api/customer/orders/${orderId}${qs}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as ApiOrderResponse;
        setOrderState(json.status);
      } catch {
        // Poll errors are transient; keep last known UI state.
      }
    }, 2500);
    return () => clearInterval(poll);
  }, [orderId]);

  const selectedTable = tables.find((x) => x.code === tableCode);

  const filtered = useMemo(
    () => (category === 'all' ? menu : menu.filter((i) => i.category === category)),
    [category, menu],
  );

  const total = cart.reduce((acc, line) => acc + line.item.price * line.qty, 0);

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.item.id === item.id);
      if (idx === -1) return [...prev, { item, qty: 1 }];
      const copy = [...prev];
      copy[idx] = { ...copy[idx], qty: copy[idx].qty + 1 };
      return copy;
    });
  }

  function changeQty(itemId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((line) => (line.item.id === itemId ? { ...line, qty: Math.max(0, line.qty + delta) } : line))
        .filter((line) => line.qty > 0),
    );
  }

  async function submitOrder() {
    if (cart.length === 0) return;

    try {
      const payload = {
        tableCode,
        branchSlug: new URLSearchParams(window.location.search).get('branch') ?? undefined,
        items: cart.map((line) => ({ productId: line.item.id, quantity: line.qty })),
      };
      const res = await fetch('/api/customer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Order HTTP ${res.status}`);
      const json = (await res.json()) as ApiOrderResponse;
      setOrderId(json.id);
      setOrderState(json.status);
      setCart([]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Order failed');
    }
  }

  return (
    <main className="min-h-screen text-slate-900 dark:text-slate-100">
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-teal-700 via-emerald-700 to-green-800 p-5 text-white shadow-xl shadow-emerald-900/25 sm:p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-emerald-100">Musteri Ekrani</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Siparis Ver</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-white/20 px-3 py-1">
              Konum: {selectedTable?.name ?? tableCode}
            </span>
            <select
              value={tableCode}
              onChange={(e) => setTableCode(e.target.value)}
              className="rounded-lg border border-white/30 bg-white/15 px-3 py-1.5 text-white"
            >
              {tables.map((t) => (
                <option key={t.id} value={t.code} className="text-slate-900">
                  {t.name} ({t.capacity} kisi)
                </option>
              ))}
            </select>
            </div>
          </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {showLoginHint && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Bu hesapta musteri siparis yetkisi kapali. Hero panelden servis yetkisi acilabilir.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {(['all', 'coffee', 'tea', 'food', 'dessert'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    category === key
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white/80 text-slate-700 hover:bg-emerald-50 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {key === 'all' ? 'Tum urunler' : CATEGORY_LABEL[key]}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {loading && (
                <p className="col-span-full text-sm text-slate-500 dark:text-slate-400">Menu yukleniyor...</p>
              )}
              {filtered.map((item) => (
                <article key={item.id} className="surface-card overflow-hidden rounded-2xl p-0">
                  <img
                    src={item.imageUrl || MENU_FALLBACK_IMAGE}
                    alt={item.name}
                    className="h-28 w-full object-cover sm:h-32"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = MENU_FALLBACK_IMAGE;
                    }}
                  />
                  <div className="p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {CATEGORY_LABEL[item.category]}
                  </p>
                  <h2 className="mt-1 text-base font-semibold">{item.name}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.note}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{item.price} TL</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="min-h-10 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-800"
                    >
                      Ekle
                    </button>
                  </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="surface-card h-fit rounded-3xl p-4 sm:p-5 lg:sticky lg:top-16">
            <h3 className="text-lg font-semibold">Sepet</h3>
            <div className="mt-4 space-y-3">
              {cart.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Sepet bos.</p>}
              {cart.map((line) => (
                <div key={line.item.id} className="rounded-xl border border-slate-200/70 p-3 dark:border-slate-700/70">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{line.item.name}</span>
                    <span className="text-xs text-slate-500">{line.item.price * line.qty} TL</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => changeQty(line.item.id, -1)}
                      className="h-7 w-7 rounded-md border border-slate-300 text-sm dark:border-slate-600"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm">{line.qty}</span>
                    <button
                      onClick={() => changeQty(line.item.id, 1)}
                      className="h-7 w-7 rounded-md border border-slate-300 text-sm dark:border-slate-600"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-slate-900 p-3 text-white dark:bg-slate-800">
              <div className="flex items-center justify-between text-sm">
                <span>Toplam</span>
                <span className="text-lg font-bold">{total} TL</span>
              </div>
            </div>

            <button
              onClick={submitOrder}
              disabled={cart.length === 0}
              className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Siparisi Gonder
            </button>

            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-3 text-sm dark:border-slate-700">
              <p className="font-medium">Durum</p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                {orderState === 'idle' && 'Hazir - siparis bekleniyor'}
                {orderState === 'received' && 'Siparis alindi'}
                {orderState === 'preparing' && 'Mutfak hazirliyor'}
                {orderState === 'ready' && 'Siparis hazir - afiyet olsun'}
              </p>
              {orderId && <p className="mt-2 text-xs text-slate-500">Takip no: {orderId.slice(0, 8)}</p>}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
