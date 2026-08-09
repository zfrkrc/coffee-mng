'use client';

import { useEffect, useState } from 'react';
import { saveAuthToken } from '../../lib/auth';

type BranchItem = {
  id: string;
  slug: string;
  name: string;
  address?: string;
  active: boolean;
};

type ResolveResponse = {
  member: {
    id: string;
    displayName: string;
  };
  branches?: BranchItem[];
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [branchSlug, setBranchSlug] = useState('');
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const isSuperadminMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('superadmin') === '1';

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('branch');
    if (p) setBranchSlug(p);
  }, []);

  useEffect(() => {
    if (isSuperadminMode) return;
    async function loadBranches() {
      try {
        const rootRes = await fetch('/api/access/resolve-host-root', { cache: 'no-store' });
        if (!rootRes.ok) return;
        const root = (await rootRes.json()) as { slug?: string };
        if (!root.slug) return;

        const res = await fetch(`/api/access/resolve-host/${encodeURIComponent(root.slug)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as ResolveResponse;
        const activeBranches = (json.branches ?? []).filter((b) => b.active);
        setBranches(activeBranches);
        if (!branchSlug && activeBranches.length > 0) {
          setBranchSlug(activeBranches[0].slug);
        }
      } catch {
        // optional helper load; login still works with manual input
      }
    }
    void loadBranches();
  }, [branchSlug, isSuperadminMode]);

  async function submit() {
    setLoading(true);
    try {
      const body = isSuperadminMode ? { email, password } : { email, password, branchSlug: branchSlug.trim() || undefined };
      const res = await fetch(isSuperadminMode ? '/api/access/superadmin/login' : '/api/access/login-host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Login HTTP ${res.status}`);
      const json = (await res.json()) as { token: string; user?: { role?: string } };
      saveAuthToken(json.token);
      if (isSuperadminMode || json.user?.role === 'superadmin') {
        window.location.href = '/hero';
        return;
      }
      window.location.href = '/domain-redirect';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giris basarisiz');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <section className="mx-auto max-w-md surface-card rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">CafeOS</p>
        <h1 className="mt-1 text-2xl font-bold">{isSuperadminMode ? 'Superadmin Girisi' : 'Personel Girisi'}</h1>
        <p className="mt-1 text-sm text-slate-500">{isSuperadminMode ? 'Sadece cafeos.zk.net.tr superadmin erisimi' : 'Domain bazli guvenli erisim'}</p>
        <div className="mt-5 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="sifre"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          {!isSuperadminMode && (
            <>
              {branches.length > 0 ? (
                <select
                  value={branchSlug}
                  onChange={(e) => setBranchSlug(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.slug}>
                      {branch.name} ({branch.slug})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={branchSlug}
                  onChange={(e) => setBranchSlug(e.target.value)}
                  placeholder="sube slug (or: ayranci, bahceli)"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              )}
            </>
          )}
          <button
            onClick={() => void submit()}
            disabled={loading}
            className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-400"
          >
            {loading ? 'Giris yapiliyor...' : 'Giris yap'}
          </button>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      </section>
    </main>
  );
}
