'use client';

import { useEffect, useMemo, useState } from 'react';
import { authFetch, clearAuthToken } from '../../lib/auth';

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

type MenuItem = {
  id: string;
  name: string;
  priceCents: number;
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editTableCode, setEditTableCode] = useState('');
  const [editRows, setEditRows] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [branchSlug, setBranchSlug] = useState<string | null>(null);
  const [authBlocked, setAuthBlocked] = useState(false);
  const branchQuery = branchSlug ? `?branch=${encodeURIComponent(branchSlug)}` : '';

  useEffect(() => {
    setBranchSlug(new URLSearchParams(window.location.search).get('branch'));
  }, []);

  async function loadOrders() {
    try {
      const branch = new URLSearchParams(window.location.search).get('branch');
      const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
      const res = await authFetch(`/api/customer/kitchen/orders${qs}`, { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        setAuthBlocked(true);
        setError('Mutfak yetkisi bulunamadi. Giris ekranina yonlendiriliyorsun...');
        clearAuthToken();
        setTimeout(() => {
          window.location.href = `/login${qs}`;
        }, 700);
        return;
      }
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const payload = (await res.json()) as { message?: string; error?: string };
          message = payload.message || payload.error || message;
        } catch {
          const text = await res.text();
          if (text) message = text;
        }
        throw new Error(message);
      }
      const json = (await res.json()) as { items: KitchenOrder[] };
      setOrders(json.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kitchen list unavailable');
    } finally {
      setLoading(false);
    }
  }

  async function loadMenu() {
    const branch = new URLSearchParams(window.location.search).get('branch');
    const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
    const res = await fetch(`/api/customer/menu${qs}`, { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json()) as { items: MenuItem[] };
    setMenu(json.items);
  }

  async function advanceOrder(orderId: string) {
    const branch = new URLSearchParams(window.location.search).get('branch');
    const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
    await authFetch(`/api/customer/kitchen/orders/${orderId}/advance${qs}`, { method: 'POST' });
    await loadOrders();
  }

  function startEdit(order: KitchenOrder) {
    if (order.status === 'ready') return;
    setEditingOrderId(order.id);
    setEditTableCode(order.tableCode);
    setEditRows(order.items.map((item) => ({ productId: menu.find((m) => m.name === item.name)?.id ?? '', quantity: item.quantity })).filter((r) => r.productId));
  }

  function addEditRow() {
    if (!menu[0]) return;
    setEditRows((prev) => [...prev, { productId: menu[0].id, quantity: 1 }]);
  }

  function updateEditRow(idx: number, next: Partial<{ productId: string; quantity: number }>) {
    setEditRows((prev) => prev.map((row, i) => (i === idx ? { ...row, ...next } : row)));
  }

  function removeEditRow(idx: number) {
    setEditRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function saveEdit(orderId: string) {
    const branch = new URLSearchParams(window.location.search).get('branch');
    const qs = branch ? `?branch=${encodeURIComponent(branch)}` : '';
    const rows = editRows.filter((r) => r.productId && r.quantity > 0);
    const res = await authFetch(`/api/customer/kitchen/orders/${orderId}/edit${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableCode: editTableCode, items: rows }),
    });
    if (!res.ok) {
      setError(`Duzenleme basarisiz: HTTP ${res.status}`);
      return;
    }
    setEditingOrderId(null);
    setEditRows([]);
    await loadOrders();
  }

  useEffect(() => {
    if (authBlocked) return;
    void loadOrders();
    void loadMenu();
    const t = setInterval(() => void loadOrders(), 3000);
    return () => clearInterval(t);
  }, [authBlocked]);

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
          <StageColumn
            title="Yeni"
            accent="bg-sky-600"
            items={grouped.received}
            onAdvance={advanceOrder}
            onStartEdit={startEdit}
            editingOrderId={editingOrderId}
            editTableCode={editTableCode}
            setEditTableCode={setEditTableCode}
            editRows={editRows}
            menu={menu}
            onEditRowChange={updateEditRow}
            onAddRow={addEditRow}
            onRemoveRow={removeEditRow}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditingOrderId(null)}
          />
          <StageColumn
            title="Hazirlaniyor"
            accent="bg-amber-600"
            items={grouped.preparing}
            onAdvance={advanceOrder}
            onStartEdit={startEdit}
            editingOrderId={editingOrderId}
            editTableCode={editTableCode}
            setEditTableCode={setEditTableCode}
            editRows={editRows}
            menu={menu}
            onEditRowChange={updateEditRow}
            onAddRow={addEditRow}
            onRemoveRow={removeEditRow}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditingOrderId(null)}
          />
          <StageColumn
            title="Hazir"
            accent="bg-emerald-700"
            items={grouped.ready}
            onAdvance={advanceOrder}
            onStartEdit={startEdit}
            editingOrderId={editingOrderId}
            editTableCode={editTableCode}
            setEditTableCode={setEditTableCode}
            editRows={editRows}
            menu={menu}
            onEditRowChange={updateEditRow}
            onAddRow={addEditRow}
            onRemoveRow={removeEditRow}
            onSaveEdit={saveEdit}
            onCancelEdit={() => setEditingOrderId(null)}
          />
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
  onStartEdit,
  editingOrderId,
  editTableCode,
  setEditTableCode,
  editRows,
  menu,
  onEditRowChange,
  onAddRow,
  onRemoveRow,
  onSaveEdit,
  onCancelEdit,
}: {
  title: string;
  accent: string;
  items: KitchenOrder[];
  onAdvance: (orderId: string) => Promise<void>;
  onStartEdit: (order: KitchenOrder) => void;
  editingOrderId: string | null;
  editTableCode: string;
  setEditTableCode: (v: string) => void;
  editRows: Array<{ productId: string; quantity: number }>;
  menu: MenuItem[];
  onEditRowChange: (idx: number, next: Partial<{ productId: string; quantity: number }>) => void;
  onAddRow: () => void;
  onRemoveRow: (idx: number) => void;
  onSaveEdit: (orderId: string) => Promise<void>;
  onCancelEdit: () => void;
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
              <div className="flex items-center gap-2">
                {order.status !== 'ready' && (
                  <button
                    onClick={() => void onAdvance(order.id)}
                    className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white"
                  >
                    Ilerle
                  </button>
                )}
                {order.status !== 'ready' && (
                  <button
                    onClick={() => onStartEdit(order)}
                    className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700"
                  >
                    Duzenle
                  </button>
                )}
              </div>
            </div>

            {editingOrderId === order.id && (
              <div className="mt-3 space-y-2 rounded-lg border border-dashed border-slate-300 p-2 dark:border-slate-700">
                <input
                  value={editTableCode}
                  onChange={(e) => setEditTableCode(e.target.value.toUpperCase())}
                  placeholder="Masa kodu"
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                />
                {editRows.map((row, idx) => (
                  <div key={`${order.id}-edit-${idx}`} className="flex items-center gap-2">
                    <select
                      value={row.productId}
                      onChange={(e) => onEditRowChange(idx, { productId: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                    >
                      {menu.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => onEditRowChange(idx, { quantity: Number(e.target.value) || 1 })}
                      className="w-16 rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
                    />
                    <button onClick={() => onRemoveRow(idx)} className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700">Sil</button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <button onClick={onAddRow} className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Satir ekle</button>
                  <button onClick={() => void onSaveEdit(order.id)} className="rounded-md bg-emerald-700 px-2 py-1 text-xs text-white">Kaydet</button>
                  <button onClick={onCancelEdit} className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-700">Vazgec</button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
