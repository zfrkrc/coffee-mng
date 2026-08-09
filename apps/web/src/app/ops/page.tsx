'use client';

import { useEffect, useMemo, useState } from 'react';

type Overview = {
  menuCount: number;
  tableCount: number;
  openOrders: number;
  lowStockCount: number;
  totalRevenueCents: number;
};

type MenuItem = {
  id: string;
  name: string;
  category: 'coffee' | 'tea' | 'food' | 'dessert';
  priceCents: number;
  note: string;
};

type InventoryItem = {
  id: string;
  productId: string;
  productName: string;
  unit: 'pcs' | 'kg' | 'lt';
  stock: number;
  threshold: number;
};

type TableItem = {
  id: string;
  code: string;
  name: string;
  capacity: number;
  customerUrl: string;
  qrImageUrl: string;
};

type DailyReport = {
  date: string;
  orderCount: number;
  grossRevenueCents: number;
  averageOrderCents: number;
  topProducts: Array<{ productId: string; name: string; qty: number }>;
  tableLoad: Array<{ tableCode: string; tableName: string; orders: number }>;
};

export default function OpsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({ id: '', name: '', category: 'coffee', priceTl: '0', note: '' });
  const [tableForm, setTableForm] = useState({ code: '', name: '', capacity: '2' });

  async function loadAll() {
    try {
      const [ovRes, menuRes, invRes, tableRes] = await Promise.all([
        fetch('/api/customer/admin/overview', { cache: 'no-store' }),
        fetch('/api/customer/menu', { cache: 'no-store' }),
        fetch('/api/customer/admin/inventory', { cache: 'no-store' }),
        fetch('/api/customer/tables', { cache: 'no-store' }),
      ]);
      if (!ovRes.ok || !menuRes.ok || !invRes.ok || !tableRes.ok) {
        throw new Error('Ops verisi yuklenemedi');
      }

      const ov = (await ovRes.json()) as Overview;
      const menuJson = (await menuRes.json()) as { items: MenuItem[] };
      const invJson = (await invRes.json()) as { items: InventoryItem[] };
      const tableJson = (await tableRes.json()) as { items: TableItem[] };
      const reportRes = await fetch('/api/customer/admin/reports/daily', { cache: 'no-store' });
      const reportJson = reportRes.ok ? ((await reportRes.json()) as DailyReport) : null;

      setOverview(ov);
      setMenu(menuJson.items);
      setInventory(invJson.items);
      setTables(tableJson.items);
      setReport(reportJson);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ops failed');
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function saveMenuItem() {
    const price = Math.round(Number(form.priceTl) * 100);
    if (!form.id || !form.name || !price) return;
    await fetch('/api/customer/admin/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: form.id.trim(),
        name: form.name.trim(),
        category: form.category,
        priceCents: price,
        note: form.note.trim(),
      }),
    });
    setForm({ id: '', name: '', category: 'coffee', priceTl: '0', note: '' });
    await loadAll();
  }

  async function deleteMenuItem(itemId: string) {
    await fetch(`/api/customer/admin/menu/${itemId}/delete`, { method: 'POST' });
    await loadAll();
  }

  async function adjustStock(productId: string, delta: number) {
    await fetch(`/api/customer/admin/inventory/${productId}/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta }),
    });
    await loadAll();
  }

  async function saveTable() {
    if (!tableForm.code || !tableForm.name) return;
    await fetch('/api/customer/admin/tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: tableForm.code,
        name: tableForm.name,
        capacity: Number(tableForm.capacity) || 2,
      }),
    });
    setTableForm({ code: '', name: '', capacity: '2' });
    await loadAll();
  }

  async function deleteTable(code: string) {
    const res = await fetch(`/api/customer/admin/tables/${code}/delete`, { method: 'POST' });
    if (!res.ok) {
      const txt = await res.text();
      setError(`Masa silinemedi: ${txt}`);
      return;
    }
    await loadAll();
  }

  const lowStock = useMemo(() => inventory.filter((x) => x.stock <= x.threshold), [inventory]);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Isletme Paneli</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Menu, depo, masa ve operasyon yonetimi</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/kitchen" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">Mutfak</a>
            <a href="/qr" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">Masa QR</a>
            <button onClick={() => void loadAll()} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">Yenile</button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard title="Menu" value={`${overview?.menuCount ?? 0}`} />
          <KpiCard title="Masa" value={`${overview?.tableCount ?? 0}`} />
          <KpiCard title="Acik siparis" value={`${overview?.openOrders ?? 0}`} />
          <KpiCard title="Dusuk stok" value={`${overview?.lowStockCount ?? 0}`} tone="warn" />
          <KpiCard title="Hazir ciro" value={`${Math.round((overview?.totalRevenueCents ?? 0) / 100)} TL`} tone="good" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="surface-card rounded-2xl p-4">
            <h2 className="mb-3 text-lg font-semibold">Menu duzenleme</h2>
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <input value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} placeholder="id (latte-large)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="urun adi" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="coffee">Kahve</option>
                <option value="tea">Cay</option>
                <option value="food">Yiyecek</option>
                <option value="dessert">Tatli</option>
              </select>
              <input value={form.priceTl} onChange={(e) => setForm((f) => ({ ...f, priceTl: e.target.value }))} placeholder="fiyat (TL)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
              <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="aciklama" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 sm:col-span-2" />
            </div>
            <button onClick={() => void saveMenuItem()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white">Kaydet</button>

            <div className="mt-4 space-y-2">
              {menu.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
                  <span>{item.name} ({Math.round(item.priceCents / 100)} TL)</span>
                  <button onClick={() => void deleteMenuItem(item.id)} className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:text-red-300">Sil</button>
                </div>
              ))}
            </div>
          </section>

          <section className="surface-card rounded-2xl p-4">
            <h2 className="mb-3 text-lg font-semibold">Depo takip</h2>
            {lowStock.length > 0 && (
              <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                Kritik stok: {lowStock.map((x) => x.productName).join(', ')}
              </div>
            )}
            <div className="space-y-2">
              {inventory.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.productName}</span>
                    <span className={item.stock <= item.threshold ? 'text-amber-600' : 'text-slate-500'}>
                      {item.stock} {item.unit}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => void adjustStock(item.productId, -1)} className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">-1</button>
                    <button onClick={() => void adjustStock(item.productId, 1)} className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">+1</button>
                    <button onClick={() => void adjustStock(item.productId, 5)} className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">+5</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="surface-card mt-6 rounded-2xl p-4">
          <h2 className="mb-3 text-lg font-semibold">Masa durumu ve QR</h2>
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <input
              value={tableForm.code}
              onChange={(e) => setTableForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="kod (T9)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <input
              value={tableForm.name}
              onChange={(e) => setTableForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Masa 9"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <div className="flex gap-2">
              <input
                value={tableForm.capacity}
                onChange={(e) => setTableForm((f) => ({ ...f, capacity: e.target.value }))}
                placeholder="kapasite"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <button onClick={() => void saveTable()} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white">
                Ekle
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {tables.map((t) => (
              <div key={t.id} className="rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-slate-500">Kod: {t.code} · {t.capacity} kisi</p>
                <a href={t.customerUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-emerald-700 dark:text-emerald-400">Musteri linki</a>
                <button onClick={() => void deleteTable(t.code)} className="mt-2 rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:text-red-300">
                  Sil
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card mt-6 rounded-2xl p-4">
          <h2 className="mb-3 text-lg font-semibold">Gunluk rapor</h2>
          {!report && <p className="text-sm text-slate-500">Rapor bekleniyor...</p>}
          {report && (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
                  Siparis: <strong>{report.orderCount}</strong>
                </div>
                <div className="rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
                  Ciro: <strong>{Math.round(report.grossRevenueCents / 100)} TL</strong>
                </div>
                <div className="rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
                  Ortalama: <strong>{Math.round(report.averageOrderCents / 100)} TL</strong>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Top urunler</h3>
                  <div className="space-y-1 text-sm">
                    {report.topProducts.map((p) => (
                      <div key={p.productId} className="rounded-md border border-slate-200 px-2 py-1 dark:border-slate-700">
                        {p.name} · {p.qty} adet
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Masa yuk dagilimi</h3>
                  <div className="space-y-1 text-sm">
                    {report.tableLoad.map((t) => (
                      <div key={t.tableCode} className="rounded-md border border-slate-200 px-2 py-1 dark:border-slate-700">
                        {t.tableName} · {t.orders} siparis
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

function KpiCard({ title, value, tone = 'default' }: { title: string; value: string; tone?: 'default' | 'warn' | 'good' }) {
  return (
    <div className="surface-card rounded-xl p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <p className={`mt-1 text-xl font-bold ${tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{value}</p>
    </div>
  );
}
