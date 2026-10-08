# CafeOS Edge — SRS + SDD (Spec)

## 1. Amaç / Kapsam
**Offline-first** kafe yönetim platformu: POS, masa, sipariş, stok, rapor.
Kenarda (edge/şube) çalışır; internet kopsa da satış sürer, bağlantı gelince senkron.

## 2. Aktörler
- **Kasiyer/Barista** — sipariş, ödeme (web/kasa).
- **Şube yöneticisi** — stok, rapor.
- **Merkez** — çok şube, konsolidasyon.

## 3. Fonksiyonel Gereksinimler (FR)
- FR1 Masa & sipariş yönetimi (aç/kapat, kalem ekle).
- FR2 Ürün/menü & fiyat yönetimi.
- FR3 Stok takibi + uyarı.
- FR4 Raporlar (günlük satış, ürün bazlı).
- FR5 **Offline mod:** bağlantı yokken yerel çalış; kuyrukla senkron.
- FR6 Şube/node ajanı (edge senkron) + yedekleme.
- FR7 (Opsiyonel) AI `management_summary` → InsightMap gateway (fallback deterministik).

## 4. Fonksiyonel Olmayan Gereksinimler (NFR)
- NFR1 **Dayanıklılık:** offline çalışma; veri kaybı yok (kuyruk + yedek).
- NFR2 **Tutarlılık:** çakışma çözümü (branch flow).
- NFR3 **Güvenlik:** yerel + merkez yetkilendirme.

## 5. Mimari (SDD) — pnpm monorepo
```
apps/api          (@cafeos/api)          — ana API/iş mantığı
apps/web          (@cafeos/web)          — kasa/panel UI
apps/backup-agent (@cafeos/backup-agent) — yedekleme
apps/node-agent   (@cafeos/node-agent)   — şube/edge senkron
packages/{config,domain,shared,types}    — ortak
docs/                                     — ARCHITECTURE, OFFLINE, BACKUP, DATABASE, DEPLOYMENT, SECURITY, UPDATE, WAYCOFFEE-BRANCH-FLOW
```

## 6. Açık İşler (ajan görevleri)
- [ ] Offline senkron çakışma testleri.
- [ ] Stok/rapor genişletme.
- [ ] AI özet (gateway) entegrasyonu.

## 7. Ortam
- Branch: `cafeos.zk.net.tr` / `cafeos.waycoffee.com.tr` / `cafe.zk.net.tr`.
- İlgili: `wayankara` (Way Coffee sitesi).
