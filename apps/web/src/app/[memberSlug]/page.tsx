'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { clearAuthToken, fetchMe, type AuthUser } from '../../lib/auth';

type ServiceKey = 'customer-order' | 'kitchen-board' | 'qr-management' | 'ops-dashboard' | 'ai-station';

type ResolveResponse = {
  member: {
    id: string;
    email: string;
    slug: string;
    displayName: string;
    domain: string;
    services: ServiceKey[];
    active: boolean;
  };
  staff: Array<{
    id: string;
    email: string;
    displayName: string;
    role: 'admin' | 'cashier' | 'waiter' | 'kitchen' | 'viewer';
    active: boolean;
  }>;
  branches: Array<{
    id: string;
    slug: string;
    name: string;
    address?: string;
    active: boolean;
  }>;
};

const SERVICE_LINKS: Record<ServiceKey, { href: string; label: string }> = {
  'customer-order': { href: '/m', label: 'Musteri Siparis' },
  'kitchen-board': { href: '/kitchen', label: 'Mutfak (KDS)' },
  'qr-management': { href: '/qr', label: 'Masa QR' },
  'ops-dashboard': { href: '/ops', label: 'Isletme Paneli' },
  'ai-station': { href: '/ai-station', label: 'AI Station' },
};

const ROLE_SERVICE_ALLOW: Record<string, ServiceKey[]> = {
  owner: ['customer-order', 'kitchen-board', 'qr-management', 'ops-dashboard', 'ai-station'],
  admin: ['customer-order', 'kitchen-board', 'qr-management', 'ops-dashboard', 'ai-station'],
  cashier: ['customer-order', 'ops-dashboard'],
  waiter: ['customer-order', 'kitchen-board'],
  kitchen: ['kitchen-board'],
  viewer: ['customer-order'],
};

export default function MemberEntryPage() {
  const params = useParams<{ memberSlug: string }>();
  const memberSlug = params.memberSlug;
  const [data, setData] = useState<ResolveResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState<AuthUser | null>(null);

  useEffect(() => {
    async function guard() {
      const me = await fetchMe();
      const host = window.location.hostname.toLowerCase();
      if (!me || me.domain !== host) {
        window.location.replace('/login');
        return;
      }
      setMe(me);
      setAuthChecked(true);
    }
    void guard();
  }, []);

  useEffect(() => {
    if (!memberSlug || !authChecked) return;
    async function load() {
      try {
        const res = await fetch(`/api/access/resolve-host/${encodeURIComponent(memberSlug)}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Resolve HTTP ${res.status}`);
        const json = (await res.json()) as ResolveResponse;
        setData(json);
        setError(null);
      } catch (e) {
        setData(null);
        setError(e instanceof Error ? e.message : 'Erisim bulunamadi');
      }
    }
    void load();
  }, [authChecked, memberSlug]);

  const enabledServices = useMemo(() => {
    if (!data) return [];
    if (!me) return [];
    const roleAllowed = ROLE_SERVICE_ALLOW[me.role] ?? [];
    return data.member.services.filter((service) => roleAllowed.includes(service));
  }, [data, me]);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-4xl">
        <div className="surface-card rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">CafeOS Member Access</p>
            {me && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{me.name} ({me.role})</span>
                <button
                  onClick={() => {
                    clearAuthToken();
                    window.location.replace('/login');
                  }}
                  className="rounded-md border border-slate-300 px-2 py-1 dark:border-slate-700"
                >
                  Cikis
                </button>
              </div>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold">{data?.member.displayName ?? 'Uye girisi'}</h1>
          <p className="mt-1 text-sm text-slate-500">{data ? `${data.member.domain}/${data.member.slug}` : 'Alan adi ve slug ile dogrulaniyor'}</p>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              Bu rota icin uye bulunamadi: {error}
            </div>
          )}

          {data && !data.member.active && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Uye pasif durumda. Superadmin tekrar aktiflestirmeli.
            </div>
          )}

          {data && data.member.active && (
            <>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {enabledServices.map((service) => {
                  const item = SERVICE_LINKS[service];
                  return (
                    <a
                      key={service}
                      href={item.href}
                      className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {item.label}
                    </a>
                  );
                })}
              </div>

              <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-3 text-sm dark:border-slate-700">
                <p className="font-medium">Personel listesi</p>
                <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  {data.staff.length === 0 ? (
                    <p>Personel eklenmemis.</p>
                  ) : (
                    data.staff.map((staff) => (
                      <p key={staff.id}>
                        {staff.displayName} ({staff.email}) - {staff.role} {staff.active ? '' : '(pasif)'}
                      </p>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-3 text-sm dark:border-slate-700">
                <p className="font-medium">Sube secimi</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {(data.branches ?? []).filter((b) => b.active).map((branch) => (
                    <a
                      key={branch.id}
                      href={`/login?branch=${encodeURIComponent(branch.slug)}`}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <div className="font-semibold">{branch.name}</div>
                      <div>{branch.slug}{branch.address ? ` · ${branch.address}` : ''}</div>
                      <div className="mt-1 text-[11px] text-emerald-700">Bu subeye giris yap</div>
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
