'use client';

import { useEffect, useState } from 'react';

const FEATURES = [
  { icon: '🗃️', title: 'Masa Hesap Takibi', desc: 'QR ile masa aç. Sipariş → hazırlanıyor → hazır → servis edildi. Kalem bazında durum takibi. Asla yanlış hesap yok.' },
  { icon: '🍔', title: 'Menü & Sipariş Yönetimi', desc: 'Kategorilere göre menü. Canlı sipariş akışı. Mutfak ekranı (KDS). İptal, iade, not — hepsi kayıt altında.' },
  { icon: '📍', title: 'GPS Konum Doğrulama', desc: 'QR okuyan müşterinin konumu doğrulanır. Sadece şube semtinde olan sipariş verebilir. Sahte sipariş engeli.' },
  { icon: '💰', title: 'Kasa & Günlük Kapanış', desc: 'Sabah açılış, gün sonu kapanış. Nakit/kart ayrımı. Z-raporu. Açık hesaplar otomatik kapanır. Mutabakat garanti.' },
  { icon: '📊', title: 'AI Destekli Raporlar', desc: 'Günlük satış, ürün analizi, saatlik yoğunluk. AI istasyonu ile operasyon önerileri. Envanter takibi.' },
  { icon: '🔔', title: 'Telegram Entegrasyonu', desc: 'Sipariş, hesap talebi, kapanış — anında Telegram bildirimi. Yönetici her yerden takipte.' },
];

const GUEST_FEATURES = [
  { icon: '📱', title: 'QR ile Sipariş', desc: 'Masanızdaki QR kodu okutun, menüyü görün ve sıra beklemeden sipariş verin.' },
  { icon: '🍔', title: 'Dijital Menü', desc: 'Tüm ürünler fotoğraflı ve güncel fiyatlı. Kategorilere göre kolayca gezin.' },
  { icon: '📍', title: 'Şube Konumu', desc: 'En yakın şubemizi bulun, menüye göz atın, masanızdan sipariş edin.' },
  { icon: '💳', title: 'Hesap Takibi', desc: 'Ne sipariş ettiğinizi görün, hesabınızı isteyin, ödemeye hazır olun.' },
  { icon: '⚡', title: 'Hızlı Servis', desc: 'Siparişiniz doğrudan mutfağa düşer. Bekleme süresi kısalır.' },
  { icon: '🤝', title: 'Güvenli Sipariş', desc: 'Konum doğrulama ile sadece şubede olan sipariş verebilir. Yanlış hesap yok.' },
];

const PACKAGES = [
  { name: 'Başlangıç', audience: 'Tek şube kafeler', features: ['1 şube', 'Sınırsız masa', 'QR menü', 'Masa hesap takibi', 'Temel raporlar'], highlight: false },
  { name: 'Standart', audience: 'Büyüyen işletmeler', features: ['3 şubeye kadar', 'GPS doğrulama', 'Mutfak ekranı (KDS)', 'Günlük kapanış & Z-rapor', 'AI raporları', 'Telegram bildirim'], highlight: true },
  { name: 'Kurumsal', audience: 'Zincir & franchise', features: ['Sınırsız şube', 'On-premise / offline-first kurulum', 'API erişimi', 'Multi-tenant paneller', 'Özel entegrasyon', 'Öncelikli destek'], highlight: false },
];

const BRANCH_OPTIONS = ['1', '2-3', '4-10', '10+'];

const WAYCOFFEE_BRANCHES = [
  { slug: 'ayranci', name: 'Ayrancı Şubesi', desc: 'QR menü ve masa siparişi aktif' },
  { slug: 'bahceli', name: 'Bahçelievler Şubesi', desc: 'QR menü ve masa siparişi aktif' },
];

export default function Landing({ initialIsWaycoffee }: { initialIsWaycoffee: boolean }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isClient, setIsClient] = useState(false);
  const [isWaycoffee, setIsWaycoffee] = useState(initialIsWaycoffee);
  const [lead, setLead] = useState({ name: '', phone: '', business: '', branch: '', package: '', note: '', website: '' });
  const [leadStatus, setLeadStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem('cafeos-theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark');
    }
    // Sunucu tespitini istemciyle doğrula (yanlışsa düzelt).
    setIsWaycoffee(window.location.hostname.toLowerCase().includes('waycoffee'));
  }, []);

  useEffect(() => {
    if (isClient) document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme, isClient]);

  useEffect(() => {
    if (isClient) {
      document.title = isWaycoffee ? 'WayCoffee — Dijital Menü ve Masa Siparişi' : 'CafeOS Edge — Kafe Yönetim Platformu';
    }
  }, [isClient, isWaycoffee]);

  async function submitLead() {
    if (!lead.name.trim() || !lead.phone.trim() || !lead.business.trim()) return;
    setLeadStatus('sending');
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setLeadStatus('done');
      setLead({ name: '', phone: '', business: '', branch: '', package: '', note: '', website: '' });
    } catch {
      setLeadStatus('error');
    }
  }

  function choosePackage(pkg: string) {
    setLead((prev) => ({ ...prev, package: pkg }));
    document.getElementById('teklif')?.scrollIntoView({ behavior: 'smooth' });
  }

  const features = isWaycoffee ? GUEST_FEATURES : FEATURES;
  const heroTitle = isWaycoffee
    ? <>WayCoffee — <span className="bg-gradient-to-r from-brand-600 to-emerald-500 bg-clip-text text-transparent">dijital menü</span> ve masa siparişi</>
    : <>Kafenizi <span className="bg-gradient-to-r from-brand-600 to-emerald-500 bg-clip-text text-transparent">CafeOS</span> ile dijitalleştirin</>;
  const heroSub = isWaycoffee
    ? 'Ayrancı ve Bahçelievler şubelerimizde masanızdaki QR ile menüyü görün, sıra beklemeden sipariş verin, hesabınızı isteyin.'
    : 'QR menü, masa hesap takibi, mutfak ekranı, günlük kapanış ve AI raporları — hepsi tek platformda.';

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-gray-100">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">{isWaycoffee ? 'WayCoffee' : 'CafeOS'}</span>
            {isWaycoffee && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">WayCoffee</span>}
          </div>
          <div className="flex items-center gap-2">
            {!isWaycoffee && (
              <a href="#paketler" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800 sm:block">Paketler</a>
            )}
            <a href="#features" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800 sm:block">Özellikler</a>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-lg border border-gray-200 bg-white/70 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900/70" aria-label="Tema değiştir">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <a href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800">Giriş</a>
            <a href="/login?superadmin=1" className="hidden rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 sm:block">Yönetici Girişi</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-block rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
              {isWaycoffee ? '☕ WayCoffee Dijital Menü' : '☕ Kafe Yönetim Sistemi'}
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">{heroTitle}</h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400">{heroSub}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {isWaycoffee ? (
                <>
                  {WAYCOFFEE_BRANCHES.map((b) => (
                    <a key={b.slug} href={`/m?branch=${b.slug}`} className="rounded-full bg-brand-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 hover:shadow-xl">{b.name} Menüsü</a>
                  ))}
                  <a href="#subeler" className="rounded-full border border-gray-300 px-8 py-3 text-base font-medium text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800">Şubelerimiz</a>
                </>
              ) : (
                <>
                  <a href="/login" className="rounded-full bg-brand-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 hover:shadow-xl">Uygulamaya Git</a>
                  <a href="#teklif" className="rounded-full border border-gray-300 px-8 py-3 text-base font-medium text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800">Teklif Al</a>
                </>
              )}
            </div>
            <div className="mt-10 flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-500">
              <span className="flex items-center gap-1.5">✓ QR Menü</span>
              <span className="flex items-center gap-1.5">✓ Masa Hesap</span>
              <span className="flex items-center gap-1.5">✓ GPS Doğrulama</span>
              <span className="flex items-center gap-1.5">✓ Günlük Kapanış</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-gray-200/60 dark:border-slate-800/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">{isWaycoffee ? 'Masanızdan sipariş verin' : 'Tek platformda kafe yönetimi'}</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">{isWaycoffee ? 'QR menü ile sıra beklemeden sipariş, güvenli ödeme, hızlı servis.' : 'Müşteri siparişinden kasa kapanışına kadar her şey izlenebilir, takip edilebilir, depolanır.'}</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                <span className="text-3xl">{f.icon}</span>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Nasıl çalışır?</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { step: '1', title: 'QR ile başla', desc: 'Masadaki QR okunur, GPS konumu doğrulanır. Menü görülür, sipariş verilir.' },
              { step: '2', title: 'Mutfak & takip', desc: 'Sipariş mutfak ekranına düşer. Hazırlanıyor → hazır → servis edildi. Her kalem takipte.' },
              { step: '3', title: 'Hesap & kapanış', desc: 'Hesap istenir. Nakit veya kart ile ödeme. Gün sonu Z-raporu ile kapanış.' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">{s.step}</div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Branches (waycoffee only) */}
      {isWaycoffee && (
        <section id="subeler" className="border-t border-gray-200/60 dark:border-slate-800/60">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-center text-3xl font-bold tracking-tight">Şubelerimiz</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {WAYCOFFEE_BRANCHES.map((b) => (
                <div key={b.name} className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-3xl">📍</span>
                  <h3 className="mt-3 text-lg font-semibold">{b.name}</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{b.desc}</p>
                  <a href={`/m?branch=${b.slug}`} className="mt-4 inline-block rounded-full border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800">Menüyü Gör</a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Paketler (zk.net.tr only — fiyat YOK) */}
      {!isWaycoffee && (
        <section id="paketler" className="border-t border-gray-200/60 dark:border-slate-800/60">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-center text-3xl font-bold tracking-tight">Paketler</h2>
            <p className="mt-3 text-center text-gray-600 dark:text-gray-400">Kafenizin büyüklüğüne ve ihtiyacına göre size uygun paketi seçin.</p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {PACKAGES.map((p) => (
                <div key={p.name} className={`flex flex-col rounded-2xl border p-6 ${p.highlight ? 'border-brand-600 bg-brand-50/30 dark:border-brand-500 dark:bg-brand-500/5 md:scale-[1.03]' : 'border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">{p.name}</h3>
                    {p.highlight && <span className="inline-block rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white">Popüler</span>}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{p.audience}</p>
                  <p className="mt-3 text-2xl font-bold">Kafenize özel teklif</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Şube sayısı ve modüllere göre fiyatlandırılır</p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {p.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-brand-600">✓</span> {feat}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => choosePackage(p.name)} className={`mt-6 block rounded-full py-3 text-center text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${p.highlight ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800'}`}>Teklif Al</button>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">Fiyatlandırma şube sayısı, masa adedi ve seçilen modüllere göre belirlenir. 24 saat içinde dönüş yapıyoruz.</p>
          </div>
        </section>
      )}

      {/* Teklif formu (zk.net.tr only) */}
      {!isWaycoffee && (
        <section id="teklif" className="border-t border-gray-200/60 dark:border-slate-800/60">
          <div className="mx-auto max-w-xl px-6 py-16">
            <h2 className="text-center text-3xl font-bold tracking-tight">Teklif Alın</h2>
            <p className="mt-3 text-center text-gray-600 dark:text-gray-400">Kafeniz için size özel teklif hazırlayalım.</p>
            {leadStatus === 'done' ? (
              <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-8 text-center dark:border-brand-500/20 dark:bg-brand-500/10">
                <span className="text-4xl">🎉</span>
                <p className="mt-4 text-lg font-semibold">Talebiniz alındı, 24 saat içinde arıyoruz.</p>
              </div>
            ) : (
              <form className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80" onSubmit={(e) => { e.preventDefault(); void submitLead(); }}>
                <div className="hidden" aria-hidden="true">
                  <input type="text" tabIndex={-1} autoComplete="off" value={lead.website} onChange={(e) => setLead({ ...lead, website: e.target.value })} />
                </div>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="lead-name" className="mb-1 block text-sm font-medium">Ad Soyad *</label>
                    <input id="lead-name" value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} placeholder="Ad Soyad" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-slate-700 dark:bg-slate-900" />
                  </div>
                  <div>
                    <label htmlFor="lead-phone" className="mb-1 block text-sm font-medium">Telefon *</label>
                    <input id="lead-phone" value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} placeholder="05XX XXX XX XX" inputMode="tel" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-slate-700 dark:bg-slate-900" aria-describedby="lead-phone-hint" />
                    <p id="lead-phone-hint" className="mt-1 text-xs text-gray-500 dark:text-gray-400">Türkiye numarası girin.</p>
                  </div>
                  <div>
                    <label htmlFor="lead-business" className="mb-1 block text-sm font-medium">İşletme adı *</label>
                    <input id="lead-business" value={lead.business} onChange={(e) => setLead({ ...lead, business: e.target.value })} placeholder="İşletme adı" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-slate-700 dark:bg-slate-900" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="lead-branch" className="mb-1 block text-sm font-medium">Şube sayısı</label>
                      <select id="lead-branch" value={lead.branch} onChange={(e) => setLead({ ...lead, branch: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-slate-700 dark:bg-slate-900">
                        <option value="">Seçin…</option>
                        {BRANCH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="lead-package" className="mb-1 block text-sm font-medium">İlgilendiğim paket</label>
                      <select id="lead-package" value={lead.package} onChange={(e) => setLead({ ...lead, package: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-slate-700 dark:bg-slate-900">
                        <option value="">Seçin…</option>
                        {PACKAGES.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="lead-note" className="mb-1 block text-sm font-medium">Not</label>
                    <textarea id="lead-note" value={lead.note} onChange={(e) => setLead({ ...lead, note: e.target.value })} placeholder="Eklemek istedikleriniz (opsiyonel)" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-slate-700 dark:bg-slate-900" />
                  </div>
                  <button type="submit" disabled={leadStatus === 'sending'} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-400">
                    {leadStatus === 'sending' ? 'Gönderiliyor...' : 'Teklif Al'}
                  </button>
                  {leadStatus === 'error' && (
                    <p className="text-sm text-rose-600">Bir hata oldu. Dilerseniz WhatsApp üzerinden de ulaşabilirsiniz: <a className="underline" href="https://wa.me/905555555555" target="_blank" rel="noopener noreferrer">WhatsApp</a></p>
                  )}
                </div>
              </form>
            )}
          </div>
        </section>
      )}

      {/* Referans / reklam şeridi */}
      {isWaycoffee ? (
        <section className="border-t border-gray-200/60 dark:border-slate-800/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm sm:flex-row">
            <p className="text-gray-600 dark:text-gray-400">Bu kafe <span className="font-semibold text-gray-900 dark:text-gray-100">CafeOS Edge</span> ile yönetiliyor.</p>
            <a href="https://cafeos.zk.net.tr" target="_blank" rel="noopener" className="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800">Kendi kafeniz için inceleyin →</a>
          </div>
        </section>
      ) : (
        <section className="border-t border-gray-200/60 dark:border-slate-800/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm sm:flex-row">
            <p className="text-gray-600 dark:text-gray-400">WayCoffee bu sistemi her gün kullanıyor.</p>
            <a href="https://cafeos.waycoffee.com.tr" target="_blank" rel="noopener" className="rounded-full border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800">Canlı Referans: WayCoffee →</a>
          </div>
        </section>
      )}

      {/* CTA (zk.net.tr only) */}
      {!isWaycoffee && (
        <section className="bg-gradient-to-r from-brand-600 to-emerald-500">
          <div className="mx-auto max-w-4xl px-6 py-16 text-center text-white">
            <h2 className="text-3xl font-bold">Kafenizi dijitalleştirmeye hazır mısınız?</h2>
            <p className="mt-3 text-lg opacity-90">QR kodları basın, menünüzü açın, satışa başlayın.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="#teklif" className="rounded-full bg-white px-8 py-3 text-base font-semibold text-brand-700 shadow-lg transition hover:bg-gray-50">Teklif Al →</a>
              <a href="/login?superadmin=1" className="rounded-full border border-white/40 px-8 py-3 text-base font-medium text-white transition hover:bg-white/10">Yönetici Paneli</a>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200/60 dark:border-slate-800/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="h-6 w-6" />
            <span className="text-sm font-semibold">{isWaycoffee ? 'WayCoffee' : 'CafeOS Edge'}</span>
          </div>
          <p className="text-xs text-gray-500">
            {isWaycoffee ? (
              <>© 2026 WayCoffee · <a className="underline hover:text-gray-700" href="https://cafeos.zk.net.tr" target="_blank" rel="noopener">Powered by CafeOS Edge</a></>
            ) : (
              <>© 2026 CafeOS · zk.net.tr · Powered by InsightMap AI</>
            )}
          </p>
        </div>
      </footer>
    </main>
  );
}
