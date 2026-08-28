# CafeOS Edge Implementation Status

## Snapshot
- Date: 2026-08-28
- Phase: Phase 1–4 (foundation → customer/kitchen/ops → sales/B2C → UX polish)
- Status: Core stack operational; Faz 1/2/3/4 canlıda test edildi

## Completed

### Faz 1 — Foundation + persistance
- Prisma/PostgreSQL kalıcılık: eski in-memory Map depolar `tenant → domain::branch` izolasyonlu tablolara taşındı (`cafe_menu_item`, `cafe_table`, `cafe_inventory`, `order`, `order_item`, `table_account`, `day_shift`).
- Sipariş **idempotency** (`client_order_id` unique — çift tıklama/retry duplicate üretmez).
- **Masa kilidi** (QR `tableToken` imzalı): token'daki masayı elle değiştiren istek 403.
- Çift onay + Mimar onay döngüsü (kapsam dışı kısım).
- Ops paneli sayaç durumu (menü/masa/açık sipariş/düşük stok/hazır ciro).
- Multi-branch desteği: `access_branches`, tenant login `branchSlug`, tüm domain verisi `domain::branchSlug` ile bölümlenir.

### Faz 2 — Menü + satış
- 2.1 **Menü görseli yerel upload + client-side canvas resize** (yeni paket YOK; `sharp` kullanılmadı):
  - `POST /api/customer/admin/menu/:itemId/image` — base64 data URL (jpeg/png/webp magic-byte doğrulama, max 5MB), tenant/branch başına `UPLOAD_DIR` volume'üne yazar, relative URL döner.
  - `GET /api/customer/files/:member/:slug/:file` — statik serve (cache-control, traversal-guard).
  - Compose `cafe_uploads` volume; ops panelinde file picker + önizleme; URL alanı korundu.
- 2.2 Kategori placeholder + görsel fallback.
- KDS FIFO/süre/renk (Faz 3 başlığı altında).

### Faz 3 — KDS (Mutfak Ekranı)
- FIFO sıralama + defensive dedupe (id bazında).
- Bekleme süresi (⏱ dk) + renk kodları (5/10 dk eşik) + accent kolon rozetleri (`max-h-[70vh]`).
- **Yeni sipariş sesi**: Web Audio iki tonlu chime, ilk yükleme çalmaz, yalnız yeni id'lerde.
- **Optimistik "İlerle"**: anında taşır + POST; hata → reload; çift tıklama koruması (advancing set).
- **Kolon bağımsız scroll** (`overflow-y-auto`).
- Sipariş düzeltme akışı (`kitchen/orders/:id/edit`; `ready` editlemez).

### Faz 4 — UX polish
- 4.1 Slug otomatik (Türkçe karakter → `-`).
- 4.2 Menü/masa form validasyonu: boşsa Kaydet/Ekle pasif, negatif fiyat/kapasite engeli + uyarı.
- 4.3 Boş durumlar (menü/depo/rapor/hesap).
- 4.4 (çift onay web) — InsightMap tarafında.
- 4.5 Demo temizlik scripti.
- 4.6 Tablet **44×44px dokunuş hedefleri** (ops/kitchen/m/stock-lab).

### Diğer
- **Satış sitesi → vitrin** dönüşümü + paketler/teklif sayfası (B2C) + branch'li menü butonları (waycoffee özel hero).
- **Lead akışı**: CafeOS teklif talepleri `zaferkaraca.net` Teklif Sihirbazı'na (quote-service) iletilir.
- AI Station: token/usage takibi (Redis, 24h panel), AI analiz ekranı.
- QR: masa QR (SVG, escape'li), customer/qr table sayfası + `t` token.
- Depo takip (stok ±, kritik uyarı) + Reçete Lab (hammadde/BOM prototip).
- Hesap akışı (open/request/close; nakit/kart), Telegram bildirimleri.
- Hesaplar kapanışta `requested` → `paid`, paymentMethod seçimi.

## Current Runtime State (canlı, ana sunucu)
- `cafe-api`: healthy (container `cafeos-api`)
- `cafe-web`: healthy (`cafeos-web`, host port **3003** — 3001 InsightMap auth'a ait!)
- `node-agent`, `backup-agent`, `postgres`, `redis`: healthy
- Volume: `cafe_uploads` (menü görselleri)

## Validation Notes
- `pnpm --filter @cafeos/api typecheck` -> pass
- `pnpm --filter @cafeos/web typecheck` -> pass
- API unit tests: `role-permissions` 4/4, `order.domain` 14/14 pass.
- ⚠️ Önceden bozuk (Prisma migrasyonu `db34067` sonrası eski constructor'lı):
  `customer.flow.e2e.spec.ts` + `ai-station.spec.ts` — düzeltilecek (bkz. testler).
- Web test: `No test files found` (beklenen; vitest'e test eklenebilir).
- Canlı smoke (Faz 2.1+: web 200, files 404, upload auth'suz 403, volume oluştu).

## Deploy Notes
- `cd /home/zfrkrc/repos/cafeos/infra/docker && WEB_PORT=3003 docker compose build cafe-api cafe-web && WEB_PORT=3003 docker compose up -d cafe-api cafe-web`
- ⚠️ `WEB_PORT` COMMUTA GİRMEZSE web 3001'e yayınlanır (host'ta InsightMap auth) — hep `WEB_PORT=3003` kullan.
- Prisma migration elle SQL ile uygulandı (`client_order_id` unique).

## Security Notes
- Secrets `.env.edge`'de (gitignored). Upload pathleri `UPLOAD_DIR` içinde tenant/branch sanitize'li; traversal guard var.

## Next / Optional
- `customer.flow.e2e.spec.ts` + `ai-station.spec.ts` test onarımı.
- Backup agent menü görselleri (cafe_uploads volume) yedek dışı — opsiyonel.
- KDS sesi PWA kurulum denetimi / daha fazla e2e (gerçek DB ile).