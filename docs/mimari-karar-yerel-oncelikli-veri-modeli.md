# Mimari Karar: Yerel-Öncelikli Veri Modeli (Dosya + Analiz + Mobil)

**Tarih:** 2026-08-18
**Durum:** 🟡 Karar verildi, **henüz uygulanmadı** — bu doküman bir tartışmanın sonucudur, kod tarafında hiçbir değişiklik yapılmamıştır.
**Amaç:** Rakiplerin çoğunun web-based olduğu bir pazarda, "dosyalarınıza kimse erişemez" iddiasını hem gerçek hem pazarlamada kullanılabilir hale getirmek — hız ve gizlilik ekseninde somut bir farklılaşma.

---

## 1. Neden Bu Karar Gerekti

Mevcut kod incelendiğinde iki farklı mimari aynı anda çalıştığı görüldü:

- **UYAP'tan indirilen evraklar** (`localServer.js` → `fileStore.js`): dosya sadece kullanıcının bilgisayarında duruyor, backend'e sadece çıkarılan metin gidiyor, Google Drive'a yedekleniyor (`backupQueue.js`/`restoreQueue.js` zaten mevcut).
- **Elle "Belge Yükle" ile atılan dosyalar** (`document.controller.ts::uploadDocument`): ham dosya doğrudan Supabase Storage'a (bulut) yükleniyor.

Bu tutarsızlık, "dosyalarınız bulutta değil sizde işlenir" pazarlama iddiasını yarı doğru kılıyordu. Aşağıdaki karar, bu iddiayı **uçtan uca gerçek** kılacak şekilde iki yolu birleştiriyor — hem de bunu, arama hızından ve mobil basitlikten ödün vermeden.

---

## 2. Karar Verilen Mimari

### 2.1 Ham Belgeler — Tamamen Yerel + Drive Yedek

- Tüm belgeler (UYAP'tan gelenler VE elle yüklenenler) sadece kullanıcının bilgisayarında, dava bazlı klasörlerde tutulur. Örnek klasör adı: `2024/468 Asliye Ceza Mahkemesi vs.`
- Elle yükleme akışı (`uploadDocument`), UYAP akışıyla aynı modele geçirilmeli — Supabase Storage'a ham dosya yüklenmesi kaldırılmalı.
- **Google Drive bağlantısı onboarding'de mecburi.** Her dava klasörü, aynı yapıyla Drive'a da yansıtılır (ayna/mirror).
- Senkron **async, best-effort** çalışır — Drive'a yazma işlemi, yerel kayıt işlemini bloklamaz (bugünkü `backupQueue` mantığı zaten bu şekilde).

### 2.2 Yerel Arama — Dava Bazlı SQLite (FTS5) + Merkezi Özet Index'i

İki katmanlı, sharding mantığıyla:

| Katman | İçerik | Boyut | Görevi |
|---|---|---|---|
| **Dava bazlı SQLite** (her dava klasöründe kendi `.sqlite` dosyası) | O davanın tüm evrak metinleri, tam metin arama (FTS5) | KB - birkaç MB | Dosya içi hızlı/detaylı arama, Drive'a **ucuz ve sık** senkron edilebilir (sadece değişen dava dosyası yeniden yüklenir) |
| **Merkezi özet index'i** (tek, küçük `.sqlite` dosyası) | Her davanın özet bilgisi: dosya no, mahkeme, usul aşaması, eksiklik var mı, kısa özet metni | Toplamda KB - düşük MB | Davalar arası hızlı sorgu ("tüm dosyalarımda eksiklik olanları listele" gibi), sık senkron edilse bile ucuz |

**Neden bu şekilde:** Tek, dev bir SQLite dosyası (tüm arşiv birleşik) teknik olarak çalışırdı (SQLite yüzlerce GB'a kadar sorunsuz), ama her küçük değişiklikte GB'larca dosyayı yeniden Drive'a yüklemek verimsiz olurdu. Dava bazlı parçalama (sharding) + küçük merkezi index, hem senkron maliyetini düşürür hem izolasyon sağlar (bir dava dosyası bozulursa sadece o dava etkilenir) hem de klasör yapınızla (dava = klasör = kendi SQLite'ı) birebir örtüşür.

**Gerçekçi boyut beklentisi:** Yoğun bir avukatın kariyeri boyunca birikmiş tüm arşivi (~1.000-2.000 dava) toplamda 1-4 GB civarı metin+index — SQLite için bu küçük bir yük, sorgu hızında gözle görülür yavaşlama beklenmez.

### 2.3 AI Analizleri (Dosya Özeti, Röntgen, Çelişki Avcısı, Strateji) — Sunucuda Kalıcı Değil

- AI modeli (Ollama) uzak sunucuda çalıştığı için, analiz üretimi sırasında metin bir kez ağa çıkmak **zorunda** — bu teknik bir sınır, kaçınılamaz.
- Ama üretilen SONUÇ, backend'de Postgres'e (`analyses` tablosu) kalıcı olarak **yazılmaz**. Sonuç Electron'a döner; Electron bunu hem dava bazlı SQLite'a hem merkezi özet index'ine hem Drive'a yazar.
- Backend bu akışta sadece bir işlemci — üret, gönder, unut.

### 2.4 Mobil — Basit Kalır, Kendi Drive Bağlantısı Kurmaz

- Mobil, kendi Drive SDK'sı/OAuth'u kurmaz — bugünkü gibi sadece kendi API'nize (laawos-backend) istek atmaya devam eder.
- Backend, mobil isteği geldiğinde **ince bir köprü (relay)** görevi görür: kullanıcının onboarding'de kurulan Drive bağlantısını kullanarak ilgili küçük dosyayı (merkezi özet index'i, ya da masaüstünün ayrıca Drive'a yazdığı "mobil özet paketi") **anlık olarak** okur, JSON olarak mobile döner, kalıcı kopya bırakmaz (en fazla birkaç dakikalık hız amaçlı geçici önbellek).
- Böylece mobil tarafta hiçbir ek mühendislik yükü olmaz, ama sunucuda da hiçbir şey kalıcı durmaz — "sadece gerekli bilgiler (özet)" isteğiniz doğal olarak karşılanmış olur, çünkü backend zaten sadece küçük özet dosyasını okuyor, ham belgeye hiç dokunmuyor.

### 2.5 Yeni Cihaz / Kurtarma Akışı

Yeni bir bilgisayara geçildiğinde: dava bazlı SQLite dosyaları ve merkezi özet index'i Drive'dan indirilir — sıfırdan yeniden indeksleme gerekmez, anında hazır olur. Aktif yazma sırasında dosya kopyalama riskine karşı (WAL/journal tutarlılığı), Drive'a yazmadan önce SQLite'ın kendi temiz anlık görüntü mekanizması (`VACUUM INTO` veya backup API) kullanılmalı — ham dosya kopyalama değil.

---

## 3. Ele Alınıp Bilerek Uygulanmayan Seçenekler

| Seçenek | Neden şimdilik yok |
|---|---|
| **AyrisLegal'in kendi şifreli yedeği (Drive'a ek üçüncü katman)** | Teknik olarak mümkün, ama anahtarı biz tutarsak "erişemeyiz" iddiası gerçek olmaz; kullanıcı kendi anahtarını tutarsa şifre unutma = veri kaybı riski (ciddi destek yükü). Drive zaten dayanıklı bir yedek sağladığı için gereksiz karmaşıklık — Drive'ın somut bir başarısızlık senaryosu (örn. hesap askıya alınması) belirlenirse ayrı değerlendirilir. |
| **Analiz özetlerini DB'de tutmaya devam etmek** | Daha basit olurdu (mobil zaten hazır, arama kolay) ama "hiçbir şey sunucuda kalıcı durmaz" iddiasını zayıflatırdı. Pazarlama farklılaşması önceliği nedeniyle Bölüm 2.3'teki yol seçildi. |
| **Kullanıcıya özel CDN/nesne depolama** | Terim karışıklığıydı — CDN, herkese açık statik içerik için tasarlanmış, tek kullanıcının özel/değişen dosyası için doğru araç değil. Kastedilen nesne depolama (S3/Supabase Storage benzeri) olsa bile, aynı "biz mi tutuyoruz" çelişkisine düşer. |
| **Mobilin kendi Drive entegrasyonunu kurması (Yol 1)** | Çalışır ama gereksiz mobil mühendislik yükü (Drive SDK + OAuth + senkron mantığı her platformda ayrı ayrı). İnce köprü (relay) modeli aynı sonucu, çok daha az işle veriyor. |

---

## 4. Pazarlama Çıkarımı

Bu mimari tamamlandığında (henüz tamamlanmadı) doğru ve doğrulanabilir şekilde şu iddia kurulabilir:

> **"Delil niteliğindeki belgeleriniz ve yapay zekanın ürettiği analiz özetleri, sunucularımızda hiçbir zaman kalıcı olarak saklanmaz — sadece sizin bilgisayarınızda ve kendi Google Drive hesabınızda kalır."**

Bu, web-based rakiplerin hiçbirinin diyemeyeceği, teknik olarak kanıtlanabilir bir cümle — "piyasada ilk biz yaptık" konumlandırmasının temeli budur.

---

## 5. Açık/Ertelenen Konular

- **Çoklu kullanıcı (büro/ofis) modeli:** Şimdilik ele alınmıyor. Ortak email/şifre paylaşımı bir ara çözüm olarak gündeme geldi, ancak planlanan koltuk-bazlı fiyatlandırma (`ayrislegal_marketing_plan.md`, `product_strategy_and_pricing.md`) ile çelişiyor — karar ertelendi.
- **Senkron zamanlama stratejisi:** Her yazmada değil, periyodik/olay-bazlı (uygulama kapanışı, belirli aralıklar) Drive senkronu tasarlanmalı — dava bazlı SQLite dosyaları küçük olduğu için bu daha az kritik hale geldi, ama merkezi index ve genel senkron kadansı netleştirilmeli.
- **SQLite tutarlı anlık görüntü mekanizması:** `VACUUM INTO`/backup API kullanımı uygulama aşamasında netleştirilmeli.

---

## 6. Sonraki Adım

Bu doküman bir **karar kaydı** — uygulama için ayrı bir teknik plan/spec gerekecek (dosya yapısı detayları, SQLite şema tasarımı, relay endpoint'i, elle-yükleme akışının UYAP moduna geçirilmesi gibi). Uygulamaya geçilmek istendiğinde ayrıca planlanmalı.
