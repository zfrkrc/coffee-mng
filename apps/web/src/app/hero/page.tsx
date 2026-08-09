'use client';

import { useEffect, useState } from 'react';

const SUPERADMIN_EMAIL = 'zafer@zaferkaraca.net';
const SERVICE_KEYS = ['customer-order', 'kitchen-board', 'qr-management', 'ops-dashboard', 'ai-station'] as const;

type ServiceKey = (typeof SERVICE_KEYS)[number];

type Member = {
  id: string;
  email: string;
  slug: string;
  displayName: string;
  domain: string;
  services: ServiceKey[];
  active: boolean;
  token: string;
  createdAt: string;
};

type Staff = {
  id: string;
  memberId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'cashier' | 'waiter' | 'kitchen' | 'viewer';
  active: boolean;
  createdAt: string;
};

export default function HeroPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [staffByMember, setStaffByMember] = useState<Record<string, Staff[]>>({});
  const [error, setError] = useState<string | null>(null);

  const [memberForm, setMemberForm] = useState({
    email: '',
    displayName: '',
    domain: '',
    slug: '',
    password: '',
    services: ['customer-order', 'kitchen-board'] as ServiceKey[],
  });

  const [staffForm, setStaffForm] = useState({
    memberId: '',
    email: '',
    displayName: '',
    role: 'waiter' as Staff['role'],
    password: '',
  });

  async function loadMembers() {
    try {
      const res = await fetch(`/api/access/members?requestedBy=${encodeURIComponent(SUPERADMIN_EMAIL)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Members HTTP ${res.status}`);
      const json = (await res.json()) as { items: Member[] };
      setMembers(json.items);
      setError(null);

      const nextStaff: Record<string, Staff[]> = {};
      for (const member of json.items) {
        const sres = await fetch(
          `/api/access/members/${member.id}/staff?requestedBy=${encodeURIComponent(SUPERADMIN_EMAIL)}`,
          { cache: 'no-store' },
        );
        if (!sres.ok) continue;
        const sjson = (await sres.json()) as { items: Staff[] };
        nextStaff[member.id] = sjson.items;
      }
      setStaffByMember(nextStaff);

      if (!staffForm.memberId && json.items.length > 0) {
        setStaffForm((prev) => ({ ...prev, memberId: json.items[0].id }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yukleme hatasi');
    }
  }

  useEffect(() => {
    void loadMembers();
  }, []);

  async function createMember() {
    await fetch('/api/access/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...memberForm, requestedBy: SUPERADMIN_EMAIL }),
    });
    setMemberForm({ email: '', displayName: '', domain: '', slug: '', password: '', services: ['customer-order', 'kitchen-board'] });
    await loadMembers();
  }

  async function toggleMemberService(member: Member, service: ServiceKey) {
    const has = member.services.includes(service);
    const services = has ? member.services.filter((s) => s !== service) : [...member.services, service];
    await fetch(`/api/access/members/${member.id}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ services, requestedBy: SUPERADMIN_EMAIL }),
    });
    await loadMembers();
  }

  async function rotateToken(memberId: string) {
    await fetch(`/api/access/members/${memberId}/token/rotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestedBy: SUPERADMIN_EMAIL }),
    });
    await loadMembers();
  }

  async function setMemberActive(memberId: string, active: boolean) {
    await fetch(`/api/access/members/${memberId}/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active, requestedBy: SUPERADMIN_EMAIL }),
    });
    await loadMembers();
  }

  async function createStaff() {
    await fetch('/api/access/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...staffForm, requestedBy: SUPERADMIN_EMAIL }),
    });
    setStaffForm((prev) => ({ ...prev, email: '', displayName: '', password: '' }));
    await loadMembers();
  }

  async function setStaffActive(staffId: string, active: boolean) {
    await fetch('/api/access/staff/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId, active, requestedBy: SUPERADMIN_EMAIL }),
    });
    await loadMembers();
  }

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Hero Panel</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Superadmin uye, servis ve token yonetimi</p>
          </div>
          <button onClick={() => void loadMembers()} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
            Yenile
          </button>
        </div>

        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <section className="surface-card mb-6 rounded-2xl p-4">
          <h2 className="mb-3 text-lg font-semibold">Yeni uye</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <input value={memberForm.email} onChange={(e) => setMemberForm((f) => ({ ...f, email: e.target.value }))} placeholder="uye email" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <input value={memberForm.displayName} onChange={(e) => setMemberForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="gorunen ad" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <input value={memberForm.domain} onChange={(e) => setMemberForm((f) => ({ ...f, domain: e.target.value }))} placeholder="domain (ornek.com)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <input value={memberForm.slug} onChange={(e) => setMemberForm((f) => ({ ...f, slug: e.target.value }))} placeholder="slug (ornek: zfrkrc)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <input value={memberForm.password} onChange={(e) => setMemberForm((f) => ({ ...f, password: e.target.value }))} type="password" placeholder="owner sifre" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <button onClick={() => void createMember()} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white">Uye olustur</button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          {members.map((member) => (
            <article key={member.id} className="surface-card rounded-2xl p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{member.displayName}</p>
                  <p className="text-xs text-slate-500">{member.email} · {member.domain}</p>
                  <p className="text-xs text-slate-500">/{member.slug} · https://{member.domain}/{member.slug}</p>
                </div>
                <button
                  onClick={() => void setMemberActive(member.id, !member.active)}
                  className={`rounded-md px-2 py-1 text-xs ${member.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}
                >
                  {member.active ? 'Aktif' : 'Pasif'}
                </button>
              </div>

              <div className="mb-3 flex flex-wrap gap-1.5">
                {SERVICE_KEYS.map((service) => {
                  const enabled = member.services.includes(service);
                  return (
                    <button
                      key={service}
                      onClick={() => void toggleMemberService(member, service)}
                      className={`rounded-full px-2.5 py-1 text-xs ${enabled ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}
                    >
                      {service}
                    </button>
                  );
                })}
              </div>

              <div className="mb-3 rounded-lg border border-dashed border-slate-300 p-2 text-xs dark:border-slate-700">
                <p className="mb-1 text-slate-500">Token</p>
                <p className="break-all font-mono text-[11px]">{member.token}</p>
                <button onClick={() => void rotateToken(member.id)} className="mt-2 rounded-md border border-slate-300 px-2 py-1 text-[11px] dark:border-slate-700">
                  Token yenile
                </button>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Personeller</p>
                <div className="space-y-1.5">
                  {(staffByMember[member.id] ?? []).map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between rounded-md border border-slate-200 px-2 py-1 text-xs dark:border-slate-700">
                      <span>{staff.displayName} · {staff.role}</span>
                      <button onClick={() => void setStaffActive(staff.id, !staff.active)} className="rounded border border-slate-300 px-1.5 py-0.5 dark:border-slate-700">
                        {staff.active ? 'Kapat' : 'Ac'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="surface-card mt-6 rounded-2xl p-4">
          <h2 className="mb-3 text-lg font-semibold">Personel ekle</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <select value={staffForm.memberId} onChange={(e) => setStaffForm((f) => ({ ...f, memberId: e.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.displayName}</option>
              ))}
            </select>
            <input value={staffForm.email} onChange={(e) => setStaffForm((f) => ({ ...f, email: e.target.value }))} placeholder="personel email" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <input value={staffForm.displayName} onChange={(e) => setStaffForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="ad soyad" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <input value={staffForm.password} onChange={(e) => setStaffForm((f) => ({ ...f, password: e.target.value }))} type="password" placeholder="personel sifre" className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <select value={staffForm.role} onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value as Staff['role'] }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
              <option value="admin">admin</option>
              <option value="cashier">cashier</option>
              <option value="waiter">waiter</option>
              <option value="kitchen">kitchen</option>
              <option value="viewer">viewer</option>
            </select>
            <button onClick={() => void createStaff()} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white">Ekle</button>
          </div>
        </section>
      </section>
    </main>
  );
}
