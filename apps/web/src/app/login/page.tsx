'use client';

import { useState } from 'react';
import { saveAuthToken } from '../../lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSuperadminMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('superadmin') === '1';

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(isSuperadminMode ? '/api/access/superadmin/login' : '/api/access/login-host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(`Login HTTP ${res.status}`);
      const json = (await res.json()) as { token: string };
      saveAuthToken(json.token);
      window.location.href = isSuperadminMode ? '/hero' : '/ops';
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
