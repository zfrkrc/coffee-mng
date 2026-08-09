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

## QR Notu (XML)
- Branch query iceren QR URL'lerinde (`.../m?table=T1&branch=...`) SVG metin alani XML escape ile basilir.
- Bu sayede `&` karakteri `&amp;` olur ve QR endpoint'i tarayicida XML parse hatasi vermez.

## Superadmin Tarafindan Yonetim
- Hero panelde uye kartinda `Subeler` listesi vardir.
- Alttaki `Sube ekle` bolumunden yeni sube acilir.
- Sube satirindan aktif/pasif yapilabilir.

## Not
- Sube degistirmek icin yeniden login gerekir (branch JWT claim icinde tasinir).

## Mutfakta Siparis Duzenleme (Personel)
- Kitchen ekraninda (`/kitchen`) `Yeni` ve `Hazirlaniyor` asamasindaki siparislerde `Duzenle` butonu gorunur.
- `Hazir` durumundaki siparisler duzenlenemez (kural backend tarafinda da zorunludur).
- Duzenle modalinda personel su alanlari gunceller:
  - masa kodu (`tableCode`)
  - urun satirlari (urun secimi + adet)
- Kaydet akisi: `POST /api/customer/kitchen/orders/:orderId/edit`
- Is kuralari:
  - en az 1 satir zorunlu
  - adet tam sayi ve `>= 1`
  - urun menu icinde olmali
  - masa kodu gecerli olmali

## Hizli Dogrulama Checklist
1. `kitchen` ekraninda bir siparis olustur (durum `received`).
2. `Duzenle` ile masa kodunu ve en az bir urunu degistir, `Kaydet` yap.
3. Kartta satirlarin/toplamin guncellendigini dogrula.
4. Siparisi `Ilerle` ile `ready` durumuna getir.
5. Ayni sipariste `Duzenle` butonunun artik gorunmedigini dogrula.
