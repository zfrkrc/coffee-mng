'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchMe } from '../lib/auth';

type BranchItem = {
  id: string;
  slug: string;
  name: string;
  active: boolean;
};

type ResolveResponse = {
  branches?: BranchItem[];
};

export default function BranchLoginSwitcher() {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const me = await fetchMe();
      setCurrentBranch(me?.branch?.slug ?? null);

      const rootRes = await fetch('/api/access/resolve-host-root', { cache: 'no-store' });
      if (!rootRes.ok) return;
      const root = (await rootRes.json()) as { slug?: string };
      if (!root.slug) return;

      const res = await fetch(`/api/access/resolve-host/${encodeURIComponent(root.slug)}`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = (await res.json()) as ResolveResponse;
      setBranches((json.branches ?? []).filter((b) => b.active));
    }

    void load();
  }, []);

  const currentLabel = useMemo(() => {
    if (!currentBranch) return 'Secili degil';
    const found = branches.find((b) => b.slug === currentBranch);
    return found?.name ?? currentBranch;
  }, [branches, currentBranch]);

  if (branches.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3 text-xs dark:border-slate-700 dark:bg-slate-900/80">
      <p className="font-medium text-slate-700 dark:text-slate-200">Sube: {currentLabel}</p>
      <p className="mt-1 text-slate-500">Diger subeye gecmek icin sec ve tekrar giris yap.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {branches.map((branch) => {
          const active = currentBranch === branch.slug;
          return (
            <a
              key={branch.id}
              href={`/login?branch=${encodeURIComponent(branch.slug)}`}
              className={`rounded-full px-3 py-1 ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
            >
              {branch.name}
            </a>
          );
        })}
      </div>
    </div>
  );
}
