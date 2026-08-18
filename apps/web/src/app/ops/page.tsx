'use client';

import { useEffect, useMemo, useState } from 'react';
import { authFetch } from '../../lib/auth';

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
  imageUrl?: string;
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

type Account = {
  id: string;
  tableCode: string;
  tableName: string;
  status: 'open' | 'paid' | 'requested';
  openedAt: string;
  requestedAt?: string;
  closedAt?: string;
  paymentMethod?: 'cash' | 'card';
  totalCents: number;
  itemCount: number;
  orderIds: string[];
};

const MENU_FALLBACK_IMAGE = '/menu-placeholder.svg';

export default function OpsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountPayMethod, setAccountPayMethod] = useState<Record<string, 'cash' | 'card'>>({});
  const [error, setError] = useState<string | null>(null);
  const [branchSlug, setBranchSlug] = useState<string | null>(null);

  const [form, setForm] = useState({ id: '', name: '', category: 'coffee', priceTl: '0', note: '', imageUrl: '' });
  const [tableForm, setTableForm] = useState({ code: '', name: '', capacity: '2' });
  const branchQuery = branchSlug ? `?branch=${encodeURIComponent(branchSlug)}` : '';

  useEffect(() => {
    setBranchSlug(new URLSearchParams(window.location.search).get('branch'));
  }, []);

  async function loadAll() {
    try {
      const branch = new URLSearchParams(window.location.search).get('branch');
      const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
      const [ovRes, menuRes, invRes, tableRes, accountRes] = await Promise.all([
        authFetch(`/api/customer/admin/overview${qs}`, { cache: 'no-store' }),
        fetch(`/api/customer/menu${qs}`, { cache: 'no-store' }),
        authFetch(`/api/customer/admin/inventory${qs}`, { cache: 'no-store' }),
        fetch(`/api/customer/tables${qs}`, { cache: 'no-store' }),
        fetch(`/api/customer/accounts${qs}`, { cache: 'no-store' }),
      ]);
      if (!ovRes.ok || !menuRes.ok || !invRes.ok || !tableRes.ok || !accountRes.ok) {
        throw new Error('Ops verisi yuklenemedi');
      }

      const ov = (await ovRes.json()) as Overview;
      const menuJson = (await menuRes.json()) as { items: MenuItem[] };
      const invJson = (await invRes.json()) as { items: InventoryItem[] };
      const tableJson = (await tableRes.json()) as { items: TableItem[] };
      const accountJson = (await accountRes.json()) as { items: Account[] };
      const reportRes = await authFetch(`/api/customer/admin/reports/daily${qs}`, { cache: 'no-store' });
      const reportJson = reportRes.ok ? ((await reportRes.json()) as DailyReport) : null;

      setOverview(ov);
      setMenu(menuJson.items);
      setInventory(invJson.items);
      setTables(tableJson.items);
      setAccounts(accountJson.items);
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
    const branch = new URLSearchParams(window.location.search).get('branch');
    const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
    const price = Math.round(Number(form.priceTl) * 100);
    if (!form.id || !form.name || !price) return;
    await authFetch(`/api/customer/admin/menu${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id.trim(),
          name: form.name.trim(),
          category: form.category,
          priceCents: price,
          note: form.note.trim(),
          imageUrl: form.imageUrl.trim() || undefined,
        }),
      });
    setForm({ id: '', name: '', category: 'coffee', priceTl: '0', note: '', imageUrl: '' });
    await loadAll();
  }

  async function deleteMenuItem(itemId: string) {
    const branch = new URLSearchParams(window.location.search).get('branch');
    const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
    await authFetch(`/api/customer/admin/menu/${itemId}/delete${qs}`, { method: 'POST' });
    await loadAll();
  }

  async function adjustStock(productId: string, delta: number) {
    const branch = new URLSearchParams(window.location.search).get('branch');
    const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
    await authFetch(`/api/customer/admin/inventory/${productId}/adjust${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta }),
    });
    await loadAll();
  }

  async function saveTable() {
    const branch = new URLSearchParams(window.location.search).get('branch');
    const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
    if (!tableForm.code || !tableForm.name) return;
    await authFetch(`/api/customer/admin/tables${qs}`, {
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
    const branch = new URLSearchParams(window.location.search).get('branch');
    const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
    const res = await authFetch(`/api/customer/admin/tables/${code}/delete${qs}`, { method: 'POST' });
    if (!res.ok) {
      const txt = await res.text();
      setError(`Masa silinemedi: ${txt}`);
      return;
    }
    await loadAll();
  }

  async function closeAccount(account: Account) {
    const branch = new URLSearchParams(window.location.search).get('branch');
    const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
    const method = accountPayMethod[account.tableCode] ?? 'cash';
    const res = await authFetch(`/api/customer/account/${account.tableCode}/close${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethod: method }),
    });
    if (!res.ok) {
      const txt = await res.text();
      setError(`Hesap kapatilamadi: ${txt}`);
      return;
    }
    await loadAll();
  }

  const lowStock = useMemo(() => inventory.filter((x) => x.stock <= x.threshold), [inventory]);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-cyan-700 via-teal-700 to-emerald-700 p-5 text-white shadow-xl shadow-cyan-900/25 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">İşletme Paneli</h1>
            <p className="text-sm text-emerald-100">Menü, depo, masa ve operasyon yönetimi</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/ai-station" className="rounded-xl border border-white/35 bg-white/10 px-3 py-2 text-sm">AI Analiz</a>
            <a href={`/kitchen${branchQuery}`} className="rounded-xl border border-white/35 bg-white/10 px-3 py-2 text-sm">Mutfak</a>
            <a href={`/qr${branchQuery}`} className="rounded-xl border border-white/35 bg-white/10 px-3 py-2 text-sm">Masa QR</a>
            <a href={`/m${branchQuery}`} className="rounded-xl border border-white/35 bg-white/10 px-3 py-2 text-sm">Müşteri</a>
            <button onClick={() => void loadAll()} className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-emerald-800">Yenile</button>
          </div>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <a href="#menu" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-900">Menü</a>
          <a href="#inventory" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-900">Depo</a>
          <a href={`/ops/stock-lab${branchQuery}`} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">Reçete Lab</a>
          <a href="#tables" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-900">Masalar</a>
          <a href="#reports" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-900">Rapor</a>
          <a href="#accounts" className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">Hesaplar</a>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard title="Menü" value={`${overview?.menuCount ?? 0}`} />
          <KpiCard title="Masa" value={`${overview?.tableCount ?? 0}`} />
          <KpiCard title="Açık sipariş" value={`${overview?.openOrders ?? 0}`} />
          <KpiCard title="Düşük stok" value={`${overview?.lowStockCount ?? 0}`} tone="warn" />
          <KpiCard title="Hazır ciro" value={`${Math.round((overview?.totalRevenueCents ?? 0) / 100)} TL`} tone="good" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section id="menu" className="surface-card rounded-2xl p-4">
            <h2 className="mb-3 text-lg font-semibold">Menü düzenleme</h2>
            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              <input value={form.id} onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))} placeholder="id (latte-large)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="ürün adı" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                <option value="coffee">Kahve</option>
                <option value="tea">Cay</option>
                <option value="food">Yiyecek</option>
                <option value="dessert">Tatli</option>
              </select>
              <input value={form.priceTl} onChange={(e) => setForm((f) => ({ ...f, priceTl: e.target.value }))} placeholder="fiyat (TL)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
              <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="açıklama" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 sm:col-span-2" />
              <input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="görsel url (opsiyonel)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 sm:col-span-2" />
            </div>
            <button onClick={() => void saveMenuItem()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white">Kaydet</button>

            <div className="mt-4 space-y-2">
              {menu.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
                  <div className="flex min-w-0 items-center gap-2">
                    <img
                      src={item.imageUrl || MENU_FALLBACK_IMAGE}
                      alt={item.name}
                      className="h-11 w-11 rounded-md object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = MENU_FALLBACK_IMAGE;
                      }}
                    />
                    <span className="truncate">{item.name} ({Math.round(item.priceCents / 100)} TL)</span>
                  </div>
                  <button onClick={() => void deleteMenuItem(item.id)} className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:text-red-300">Sil</button>
                </div>
              ))}
            </div>
          </section>

          <section id="inventory" className="surface-card rounded-2xl p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Depo takip</h2>
              <a href={`/ops/stock-lab${branchQuery}`} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium dark:border-slate-700">
                Hammadde + reçete ekranı
              </a>
            </div>
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

        <section id="tables" className="surface-card mt-6 rounded-2xl p-4">
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
                <p className="text-xs text-slate-500">Kod: {t.code} · {t.capacity} kişi</p>
                <a href={t.customerUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-emerald-700 dark:text-emerald-400">Müşteri linki</a>
                <button onClick={() => void deleteTable(t.code)} className="mt-2 rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:text-red-300">
                  Sil
                </button>
              </div>
            ))}
          </div>
        </section>

        <section id="reports" className="surface-card mt-6 rounded-2xl p-4">
          <h2 className="mb-3 text-lg font-semibold">Günlük rapor</h2>
          {!report && <p className="text-sm text-slate-500">Rapor bekleniyor...</p>}
          {report && (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
                  Sipariş: <strong>{report.orderCount}</strong>
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
                  <h3 className="mb-2 text-sm font-semibold">Top ürünler</h3>
                  <div className="space-y-1 text-sm">
                    {report.topProducts.map((p) => (
                      <div key={p.productId} className="rounded-md border border-slate-200 px-2 py-1 dark:border-slate-700">
                        {p.name} · {p.qty} adet
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Masa yük dağılımı</h3>
                  <div className="space-y-1 text-sm">
                    {report.tableLoad.map((t) => (
                      <div key={t.tableCode} className="rounded-md border border-slate-200 px-2 py-1 dark:border-slate-700">
                        {t.tableName} · {t.orders} sipariş
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <section id="accounts" className="surface-card mt-6 rounded-2xl p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Hesaplar</h2>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              Açık: {accounts.filter((a) => a.status !== 'paid').length}
            </span>
          </div>
          {accounts.length === 0 && <p className="text-sm text-slate-500">Aktif hesap yok.</p>}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`rounded-lg border p-3 text-sm dark:border-slate-700 ${
                  account.status === 'paid'
                    ? 'border-slate-200 bg-slate-50 opacity-70 dark:border-slate-800 dark:bg-slate-900'
                    : account.status === 'requested'
                      ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                      : 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{account.tableName}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      account.status === 'paid'
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                        : account.status === 'requested'
                          ? 'bg-amber-200 text-amber-900 dark:bg-amber-700 dark:text-white'
                          : 'bg-emerald-200 text-emerald-900 dark:bg-emerald-700 dark:text-white'
                    }`}
                  >
                    {account.status === 'paid' ? 'Odendi' : account.status === 'requested' ? 'Hesap istendi' : 'Açık'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {account.itemCount} ürün · {account.orderIds.length} sipariş
                  {account.paymentMethod === 'cash' ? ' · Nakit' : account.paymentMethod === 'card' ? ' · Kart' : ''}
                </p>
                <p className="mt-2 text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {Math.round(account.totalCents / 100)} TL
                </p>
                {account.status !== 'paid' && (
                  <div className="mt-3 flex items-center gap-2">
                    <select
                      value={accountPayMethod[account.tableCode] ?? 'cash'}
                      onChange={(e) =>
                        setAccountPayMethod((prev) => ({
                          ...prev,
                          [account.tableCode]: e.target.value as 'cash' | 'card',
                        }))
                      }
                      className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="cash">Nakit</option>
                      <option value="card">Kart</option>
                    </select>
                    <button
                      onClick={() => void closeAccount(account)}
                      className="flex-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Hesap Kapat
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
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
