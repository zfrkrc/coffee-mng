# CafeOS — Edge

Offline-first kafe yönetim platformu (POS / masa / sipariş / stok / rapor).
Kenarda (edge) çalışır, bağlantı kopsa da satışa devam eder; bağlantı gelince senkronlar.

## Yapı (pnpm monorepo)

| Yol | Paket | İçerik |
|---|---|---|
| `apps/api` | `@cafeos/api` | Ana API / iş mantığı |
| `apps/web` | `@cafeos/web` | Web arayüzü (kasa/panel) |
| `apps/backup-agent` | `@cafeos/backup-agent` | Yedekleme ajanı |
| `apps/node-agent` | `@cafeos/node-agent` | Şube/node ajanı (edge senkron) |
| `packages/config` | `@cafeos/config` | Ortak yapılandırma |
| `packages/domain` | `@cafeos/domain` | Alan modeli |
| `packages/shared` | `@cafeos/shared` | Paylaşılan yardımcılar |
| `packages/types` | `@cafeos/types` | Ortak tipler |

## Teknoloji
- TypeScript + pnpm workspace (`pnpm@9`)
- Node.js `>=20`
- Edge/offline-first mimari (bkz. `docs/OFFLINE.md`)

## Hızlı başlangıç
```bash
pnpm install
pnpm dev          # tüm paketleri paralel çalıştır
pnpm build        # üretim derlemesi
pnpm test         # testler
pnpm typecheck    # tip kontrolü
pnpm lint         # lint
```

## Dokümantasyon
- `docs/ARCHITECTURE.md` — mimari
- `docs/DATABASE.md` — veri modeli
- `docs/OFFLINE.md` — çevrimdışı çalışma
- `docs/BACKUP.md` — yedekleme
- `docs/DEPLOYMENT.md` — kurulum/yayın
- `docs/SECURITY.md` — güvenlik
- `docs/UPDATE.md` — güncelleme
- `docs/WAYCOFFEE-BRANCH-FLOW.md` — Way Coffee şube akışı
- `docs/IMPLEMENTATION_STATUS.md` — durum

## İlgili
- Web sitesi: `wayankara` (Way Coffee Ankara)
- Branch: `cafeos.zk.net.tr` / `cafeos.waycoffee.com.tr`
