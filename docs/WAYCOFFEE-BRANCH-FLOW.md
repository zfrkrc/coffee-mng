# WayCoffee Branch Flow

## Hedef
Tek domain altinda (`cafeos.waycoffee.com.tr`) iki subeyi ayri isletmek:
- `ayranci`
- `bahceli`

Her sube icin menu, masa, depo, siparis ve mutfak verisi birbirinden izoledir.

## Giris ve Sube Secimi
1. `https://cafeos.waycoffee.com.tr/login` ac.
2. Email/sifre gir.
3. Sube acilir listesinden sec (`Ayranci Subesi` veya `Bahcelievler Subesi`).
4. Giris sonrasi sistem otomatik olarak secili subeye yonlenir.

Alternatif direkt linkler:
- `https://cafeos.waycoffee.com.tr/login?branch=ayranci`
- `https://cafeos.waycoffee.com.tr/login?branch=bahceli`

## Nereden Anlarim Hangi Subedeyim?
- Ops ve Mutfak sayfalarinin ustunde `Sube` kutusu gorunur.
- Kutudaki ad aktif subeyi gosterir.
- Ayni kutudan diger subeye gecmek icin login linki vardir.

## Hizli Gezinme
- Ops sayfasinda hizli bolum menusu vardir: `Menu`, `Depo`, `Masalar`, `Rapor`.
- Ops ustunde kisayol linkleri vardir: `Mutfak`, `Masa QR`, `Musteri`.
- Kitchen ve QR ekranlarinda `Isletme paneli` geri linkleri vardir.
- Tum bu linkler secili branch query'sini korur (`?branch=...`).

## Superadmin Tarafindan Yonetim
- Hero panelde uye kartinda `Subeler` listesi vardir.
- Alttaki `Sube ekle` bolumunden yeni sube acilir.
- Sube satirindan aktif/pasif yapilabilir.

## Not
- Sube degistirmek icin yeniden login gerekir (branch JWT claim icinde tasinir).
