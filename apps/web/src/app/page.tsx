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

const PRICING = [
  { name: 'Başlangıç', price: 'Ücretsiz', period: '', features: ['1 şube', 'Sınırsız masa', 'QR menü', 'Temel raporlar'], cta: 'Hemen Başla', highlight: false },
  { name: 'Standart', price: '₺499', period: '/ay', features: ['3 şubeye kadar', 'GPS doğrulama', 'Günlük kapanış & Z-rapor', 'AI raporları', 'Telegram bildirim'], cta: '14 Gün Ücretsiz', highlight: true },
  { name: 'Kurumsal', price: '₺1.499', period: '/ay', features: ['Sınırsız şube', 'API erişimi', 'Özel entegrasyon', 'Öncelikli destek', 'Multi-tenant paneller'], cta: 'İletişime Geç', highlight: false },
];

export default function HomePage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem('cafeos-theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (isClient) document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme, isClient]);

  const host = isClient ? window.location.hostname.toLowerCase() : '';
  const isWaycoffee = host.includes('waycoffee');
  const brandName = isWaycoffee ? 'WayCoffee' : 'CafeOS';
  const tagline = isWaycoffee ? 'WayCoffee dijital kafe yönetim platformu' : 'Kafeler için dijital yönetim platformu';

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-gray-100">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-lg dark:border-slate-800/60 dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight">CafeOS</span>
            {isWaycoffee && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">WayCoffee</span>}
          </div>
          <div className="flex items-center gap-2">
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
            <span className="inline-block rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">☕ Kafe Yönetim Sistemi</span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">{brandName} ile kafenizi <span className="bg-gradient-to-r from-brand-600 to-emerald-500 bg-clip-text text-transparent">dijitalleştirin</span></h1>
            <p className="mt-6 text-lg text-gray-600 dark:text-gray-400">{tagline}. QR menü, masa hesap takibi, mutfak ekranı, günlük kapanış ve AI raporları — hepsi tek platformda.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="/login" className="rounded-full bg-brand-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 hover:shadow-xl">Hemen Başla →</a>
              <a href="#features" className="rounded-full border border-gray-300 px-8 py-3 text-base font-medium text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800">Özellikleri Keşfet</a>
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
            <h2 className="text-3xl font-bold tracking-tight">Tek platformda kafe yönetimi</h2>
            <p className="mt-3 text-gray-600 dark:text-gray-400">Müşteri siparişinden kasa kapanışına kadar her şey izlenebilir, takip edilebilir, depolanır.</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
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
              { step: '1', title: 'QR ile başla', desc: 'Masadaki QR okunur, GPS konumu doğrulanır. Müşteri menüyü görür, sipariş verir.' },
              { step: '2', title: 'Mutfak & takip', desc: 'Sipariş mutfak ekranına düşer. Hazırlanıyor → hazır → servis edildi. Her kalem takipte.' },
              { step: '3', title: 'Hesap & kapanış', desc: 'Müşteri hesap ister. Nakit veya kart ile ödeme. Gün sonu Z-raporu ile kapanış.' },
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

      {/* Pricing */}
      <section className="border-t border-gray-200/60 dark:border-slate-800/60">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">Fiyatlandırma</h2>
          <p className="mt-3 text-center text-gray-600 dark:text-gray-400">Kafenize uygun planı seçin. İstediğiniz zaman iptal edin.</p>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {PRICING.map((p) => (
              <div key={p.name} className={`rounded-2xl border p-6 ${p.highlight ? 'border-brand-600 bg-brand-50/30 dark:border-brand-500 dark:bg-brand-500/5' : 'border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                {p.highlight && <span className="inline-block rounded-full bg-brand-600 px-3 py-0.5 text-xs font-semibold text-white">Popüler</span>}
                <h3 className="mt-2 text-lg font-bold">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{p.price}</span>
                  <span className="text-sm text-gray-500">{p.period}</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span className="text-brand-600">✓</span> {feat}
                    </li>
                  ))}
                </ul>
                <a href="/login" className={`mt-6 block rounded-full py-3 text-center text-sm font-semibold transition ${p.highlight ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-800'}`}>{p.cta}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-brand-600 to-emerald-500">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center text-white">
          <h2 className="text-3xl font-bold">Kafenizi dijitalleştirmeye hazır mısınız?</h2>
          <p className="mt-3 text-lg opacity-90">Dakikalar içinde kurulum. QR kodları basın, menünüzü açın, satışa başlayın.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="/login" className="rounded-full bg-white px-8 py-3 text-base font-semibold text-brand-700 shadow-lg transition hover:bg-gray-50">Ücretsiz Başla →</a>
            <a href="/login?superadmin=1" className="rounded-full border border-white/40 px-8 py-3 text-base font-medium text-white transition hover:bg-white/10">Yönetici Paneli</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 dark:border-slate-800/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="h-6 w-6" />
            <span className="text-sm font-semibold">CafeOS Edge</span>
          </div>
          <p className="text-xs text-gray-500">© 2026 CafeOS · {isWaycoffee ? 'WayCoffee' : 'zk.net.tr'} · Powered by InsightMap AI</p>
        </div>
      </footer>
    </main>
  );
}