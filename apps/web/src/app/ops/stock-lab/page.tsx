'use client';

import { useEffect, useMemo, useState } from 'react';

type Unit = 'g' | 'ml' | 'pcs';

type IngredientRow = {
  id: string;
  name: string;
  unit: Unit;
  currentStock: number;
  minStock: number;
};

type RecipeRow = {
  ingredientId: string;
  amount: number;
};

type StockEntry = {
  ingredientId: string;
  qty: number;
  unitCostTl: number;
  supplier: string;
  source: 'mail-invoice' | 'manual';
  note: string;
};

const INITIAL_INGREDIENTS: IngredientRow[] = [
  { id: 'cheese', name: 'Kasar peyniri', unit: 'g', currentStock: 3000, minStock: 1200 },
  { id: 'toast-bread', name: 'Tost ekmegi', unit: 'pcs', currentStock: 60, minStock: 20 },
  { id: 'lemon-juice', name: 'Limon suyu', unit: 'ml', currentStock: 4200, minStock: 1500 },
  { id: 'sugar', name: 'Toz seker', unit: 'g', currentStock: 5500, minStock: 2000 },
  { id: 'waffle-mix', name: 'Waffle mix', unit: 'g', currentStock: 4800, minStock: 1800 },
];

const MENU_BASE = [
  { id: 'toast', name: 'Karisik Tost', portion: '1 adet' },
  { id: 'waffle', name: 'Way Waffle', portion: '1 porsiyon' },
  { id: 'lemonade', name: 'Limonata', portion: '350 ml bardak' },
];

const RECIPE_PRESETS: Record<string, RecipeRow[]> = {
  toast: [
    { ingredientId: 'cheese', amount: 150 },
    { ingredientId: 'toast-bread', amount: 2 },
  ],
  waffle: [{ ingredientId: 'waffle-mix', amount: 180 }],
  lemonade: [
    { ingredientId: 'lemon-juice', amount: 120 },
    { ingredientId: 'sugar', amount: 20 },
  ],
};

export default function StockLabPage() {
  const [branchSlug, setBranchSlug] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<IngredientRow[]>(INITIAL_INGREDIENTS);

  const [newIngredient, setNewIngredient] = useState({ name: '', unit: 'g' as Unit, currentStock: '0', minStock: '0' });
  const [selectedMenuId, setSelectedMenuId] = useState('toast');
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>(RECIPE_PRESETS.toast);
  const [stockEntry, setStockEntry] = useState<StockEntry>({
    ingredientId: 'cheese',
    qty: 3000,
    unitCostTl: 0.22,
    supplier: 'Way Tedarik',
    source: 'mail-invoice',
    note: 'Mail faturasi import bekliyor',
  });

  useEffect(() => {
    const branch = new URLSearchParams(window.location.search).get('branch');
    setBranchSlug(branch);
  }, []);

  useEffect(() => {
    setRecipeRows(RECIPE_PRESETS[selectedMenuId] ?? []);
  }, [selectedMenuId]);

  const branchQuery = branchSlug ? `?branch=${encodeURIComponent(branchSlug)}` : '';

  const estimatedRecipeCostTl = useMemo(() => {
    const mockUnitCost: Record<string, number> = {
      cheese: 0.22,
      'toast-bread': 2.5,
      'lemon-juice': 0.09,
      sugar: 0.04,
      'waffle-mix': 0.11,
    };
    return recipeRows.reduce((sum, row) => sum + (mockUnitCost[row.ingredientId] ?? 0) * row.amount, 0);
  }, [recipeRows]);

  function addIngredient() {
    const id = newIngredient.name.trim().toLowerCase().replace(/\s+/g, '-');
    if (!id || ingredients.some((i) => i.id === id)) return;
    setIngredients((prev) => [
      ...prev,
      {
        id,
        name: newIngredient.name.trim(),
        unit: newIngredient.unit,
        currentStock: Math.max(0, Number(newIngredient.currentStock) || 0),
        minStock: Math.max(0, Number(newIngredient.minStock) || 0),
      },
    ]);
    setNewIngredient({ name: '', unit: 'g', currentStock: '0', minStock: '0' });
  }

  function addRecipeRow() {
    const first = ingredients[0];
    if (!first) return;
    setRecipeRows((prev) => [...prev, { ingredientId: first.id, amount: 1 }]);
  }

  function updateRecipeRow(index: number, patch: Partial<RecipeRow>) {
    setRecipeRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRecipeRow(index: number) {
    setRecipeRows((prev) => prev.filter((_, i) => i !== index));
  }

  function applyStockEntry() {
    const qty = Math.max(0, Math.floor(stockEntry.qty));
    setIngredients((prev) =>
      prev.map((item) =>
        item.id === stockEntry.ingredientId
          ? {
              ...item,
              currentStock: item.currentStock + qty,
            }
          : item,
      ),
    );
    setStockEntry((prev) => ({ ...prev, note: 'Depo girisi simule edildi, audit kaydi olusacak' }));
  }

  function ingredientLabel(id: string): string {
    return ingredients.find((i) => i.id === id)?.name ?? id;
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-gradient-to-r from-orange-700 via-amber-700 to-lime-700 p-5 text-white shadow-xl shadow-orange-900/25 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-100">WayCoffee stock lab</p>
              <h1 className="text-2xl font-bold">Depo giris + recete tasarim ekrani</h1>
              <p className="text-sm text-amber-100">Tost, waffle, limonata urunlerini hammaddeden yonetmek icin prototip panel</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={`/ops${branchQuery}`} className="rounded-xl border border-white/35 bg-white/10 px-3 py-2 text-sm">Ops geri don</a>
              <a href={`/kitchen${branchQuery}`} className="rounded-xl border border-white/35 bg-white/10 px-3 py-2 text-sm">Mutfak</a>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="surface-card rounded-2xl p-4">
            <h2 className="mb-3 text-lg font-semibold">Hammadde ekleme</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                value={newIngredient.name}
                onChange={(e) => setNewIngredient((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="or: Kasar peyniri"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <select
                value={newIngredient.unit}
                onChange={(e) => setNewIngredient((prev) => ({ ...prev, unit: e.target.value as Unit }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="g">gram (g)</option>
                <option value="ml">mililitre (ml)</option>
                <option value="pcs">adet (pcs)</option>
              </select>
              <input
                value={newIngredient.currentStock}
                onChange={(e) => setNewIngredient((prev) => ({ ...prev, currentStock: e.target.value }))}
                placeholder="ilk stok"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <input
                value={newIngredient.minStock}
                onChange={(e) => setNewIngredient((prev) => ({ ...prev, minStock: e.target.value }))}
                placeholder="kritik seviye"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <button onClick={addIngredient} className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white">
              Hammaddeyi ekle
            </button>

            <div className="mt-4 space-y-2">
              {ingredients.map((item) => {
                const low = item.currentStock <= item.minStock;
                return (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{item.name}</p>
                      <p className={low ? 'text-amber-600' : 'text-slate-500'}>
                        {item.currentStock} {item.unit}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">Kritik alt limit: {item.minStock} {item.unit}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="surface-card rounded-2xl p-4">
            <h2 className="mb-3 text-lg font-semibold">Tedarik girisi (mail faturasi destekli)</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={stockEntry.ingredientId}
                onChange={(e) => setStockEntry((prev) => ({ ...prev, ingredientId: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                {ingredients.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <input
                value={stockEntry.qty}
                onChange={(e) => setStockEntry((prev) => ({ ...prev, qty: Number(e.target.value) || 0 }))}
                placeholder="miktar"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <input
                value={stockEntry.unitCostTl}
                onChange={(e) => setStockEntry((prev) => ({ ...prev, unitCostTl: Number(e.target.value) || 0 }))}
                placeholder="birim maliyet (TL)"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <input
                value={stockEntry.supplier}
                onChange={(e) => setStockEntry((prev) => ({ ...prev, supplier: e.target.value }))}
                placeholder="tedarikci"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <select
                value={stockEntry.source}
                onChange={(e) => setStockEntry((prev) => ({ ...prev, source: e.target.value as StockEntry['source'] }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="mail-invoice">mail faturasi</option>
                <option value="manual">manuel giris</option>
              </select>
              <input
                value={stockEntry.note}
                onChange={(e) => setStockEntry((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="not"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <button onClick={applyStockEntry} className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Depoya giris isle
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Akis hedefi: mail kutusundan gelen fatura once taslak hareket olur, sonra personel teyit eder.
            </p>
          </section>
        </div>

        <section className="surface-card rounded-2xl p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Menu urunu recetesi (BOM)</h2>
            <div className="flex items-center gap-2">
              <select
                value={selectedMenuId}
                onChange={(e) => setSelectedMenuId(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                {MENU_BASE.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <button onClick={addRecipeRow} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700">
                Satir ekle
              </button>
            </div>
          </div>

          <div className="mb-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
            Secili urun: <strong>{MENU_BASE.find((x) => x.id === selectedMenuId)?.name}</strong> -
            Porsiyon: <strong>{MENU_BASE.find((x) => x.id === selectedMenuId)?.portion}</strong> -
            Tahmini recete maliyeti: <strong>{estimatedRecipeCostTl.toFixed(2)} TL</strong>
          </div>

          <div className="space-y-2">
            {recipeRows.map((row, idx) => {
              const unit = ingredients.find((i) => i.id === row.ingredientId)?.unit ?? 'pcs';
              return (
                <div key={`${selectedMenuId}-${idx}`} className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1fr_130px_auto] dark:border-slate-700">
                  <select
                    value={row.ingredientId}
                    onChange={(e) => updateRecipeRow(idx, { ingredientId: e.target.value })}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  >
                    {ingredients.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      value={row.amount}
                      onChange={(e) => updateRecipeRow(idx, { amount: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                    <span className="text-xs text-slate-500">{unit}</span>
                  </div>
                  <button
                    onClick={() => removeRecipeRow(idx)}
                    className="rounded-lg border border-red-300 px-3 py-2 text-xs text-red-700 dark:border-red-800 dark:text-red-300"
                  >
                    Sil
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {MENU_BASE.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
                <p className="font-semibold">{item.name}</p>
                <p className="mt-1 text-xs text-slate-500">Ornek recete:</p>
                <ul className="mt-1 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {(RECIPE_PRESETS[item.id] ?? []).map((line, idx) => (
                    <li key={`${item.id}-${idx}`}>{ingredientLabel(line.ingredientId)}: {line.amount}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
