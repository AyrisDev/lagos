# AyrisLegal Tanıtım Web Sitesi — Ürün Gereksinimleri Dokümanı (PRD)

**Versiyon:** v0.1 (MVP)
**Tarih:** Ağustos 2026
**Durum:** Taslak — geliştirme öncesi son inceleme bekliyor
**İlgili doküman:** AyrisLegal MVP PRD (ana uygulama — `docs/prd.md`), AyrisLegal Backend PRD (`docs/backend.md`)

---

## 1. Problem Tanımı

AyrisLegal (Electron masaüstü uygulaması) geliştirilmeye devam ediyor, ancak ürünün şu anda hiçbir kamuya açık tanıtımı, markalı bir varlığı veya potansiyel kullanıcıların (avukatlar) ürünü keşfedip iletişime geçebileceği bir kanalı yok. Pilot kullanıcı toplama süreci ("eş ve meslektaş çevresi") kişisel ağ üzerinden yürüyor; bu ölçeklenebilir değil ve ürünün güvenilirlik/ciddiyet algısını (hukuk sektöründe kritik bir faktör) inşa etmiyor.

**Kim etkileniyor:** İş sahibi (Mustafa) — pilot kullanıcı ve ilk ödeyen müşterileri bulma sürecinde; potansiyel kullanıcılar (solo/küçük büro avukatları) — ürünü keşfetme, güvenilirliğini değerlendirme ve iletişime geçme kanalı olmadığı için.

**Çözülmezse maliyeti:** Ana uygulama PRD'sindeki "İlk 2 ay içinde 1.000 ödeyen kullanıcı" hedefi, ürünü keşfedecek bir kanal olmadan gerçekçi değil. Rakipler (Lawyer Team, Hukukçu.pro, SmartHukuk, KolayOfis, Attornaid) zaten kamuya açık web varlığına sahip; markasız kalmak pazar konumlandırmasında dezavantaj yaratır.

---

## 2. Hedefler

1. Ziyaretçinin AyrisLegal'in ne olduğunu, kime hitap ettiğini ve temel değer önerisini (pasif arama aracı değil, aktif "düşünce ortağı") 10 saniye içinde anlayabilmesi
2. Nitelikli avukat/büro ziyaretçilerinden demo talebi/iletişim formu doldurmalarını sağlamak — **sitenin birincil dönüşüm hedefi**
3. Sitenin, hukuk sektörünün beklediği güven sinyallerini (profesyonel tasarım, netlik, KVKK/gizlilik duyarlılığı) taşıması
4. Sitenin MVP uygulamayla paralel, hızlı (hedef: birkaç gün içinde) yayına alınabilmesi
5. Marka kimliğinin (AyrisLegal logosu, lacivert/teal renk paleti, Archivo tipografisi) tutarlı şekilde uygulanması

---

## 3. Kapsam Dışı (Non-Goals) — MVP v0.1

| Kapsam Dışı | Neden |
|---|---|
| Self-serve kayıt/ödeme akışı (kredi kartıyla anında satın alma) | Sitenin birincil CTA'sı demo talebi/iletişim; ödeme entegrasyonu ayrı, daha sonraki bir faz |
| Uygulama indirme/dağıtım sayfası (public download) | Uygulama henüz pilot aşamasında; herkese açık indirme linki vermek erken |
| Çoklu dil desteği (İngilizce vb.) | Hedef kitle (Türk avukatlar) tek dilli; MVP'de kapsam dışı |
| Blog / SEO içerik merkezi | Değerli olabilir ama MVP'nin kapsamı değil; ayrı bir içerik stratejisi gerektirir |
| Müşteri girişi / hesap paneli sitede | Bu, uygulamanın kendisinin işi; site sadece tanıtım katmanı |
| KVKK/ISO/SOC2 gibi uyumluluk rozetlerinin sitede öne çıkarılması | Ana uygulama PRD'sinde bu konu henüz netleşmedi ("Açık Sorular" bkz. `docs/prd.md` §7) — henüz doğrulanmamış uyumluluk iddiaları sitede öne sürülmemeli |
| Canlı chat / chatbot desteği | MVP'de form yeterli; canlı destek ayrı bir araç/süreç gerektirir |

---

## 4. Kullanıcı Hikayeleri

**Birincil persona: Solo/küçük büro avukatı (site ziyaretçisi)**

- Ziyaretçi olarak, siteye geldiğimde AyrisLegal'in ne yaptığını ve benim işime nasıl yaradığını hemen anlamak istiyorum, böylece devam edip etmeyeceğime hızlıca karar verebileyim.
- Ziyaretçi olarak, ürünün somut özelliklerini (dosya analizi, AI ile tartışma, emsal karar arama) görmek istiyorum, böylece günlük işime gerçekten katkı sağlayıp sağlamayacağını değerlendirebileyim.
- Ziyaretçi olarak, demo talep etmek veya soru sormak için kolay bulunabilir, az alanlı bir form doldurmak istiyorum, böylece iletişime geçmek zahmetli olmasın.
- Ziyaretçi olarak (güven), ürünü kimin geliştirdiğini ve verilerimin nasıl ele alındığını görmek istiyorum, böylece hassas müvekkil verisiyle çalışan bir araca güvenip güvenemeyeceğimi değerlendirebileyim.
- Ziyaretçi olarak, mobilde de siteyi düzgün görüntüleyebilmek istiyorum, böylece telefonumdan da göz atabileyim.

**İkincil persona: İş sahibi (Mustafa, site yöneticisi)**

- İş sahibi olarak, forma gelen talepleri (e-posta bildirimi veya basit bir liste ile) görebilmek istiyorum, böylece pilot adaylarla hızlıca iletişime geçebileyim.
- İş sahibi olarak, sitenin metin/görsellerini kod bilmeden kolayca güncelleyebilmek istiyorum (ya da en azından basit bir düzenleme süreciyle), böylece mesajlaşmayı pilot geri bildirimine göre hızlıca iterasyonlayabileyim.

---

## 5. Gereksinimler

### Must-Have (P0)

**P0-1: Ana Sayfa (Hero + Değer Önerisi)**
- Net bir başlık ve alt başlıkla ürünün ne olduğu ve kime hitap ettiği anlatılır ("pasif arama aracı değil, aktif düşünce ortağı" mesajı öne çıkar)
- Kabul kriterleri:
  - [ ] Sayfa açıldığında scroll yapmadan (above the fold) başlık, alt başlık ve birincil CTA butonu görünür
  - [ ] CTA butonu ("Demo Talep Et" / "İletişime Geç") iletişim formuna yönlendirir/scroll eder

**P0-2: Özellikler Bölümü**
- Ana uygulamanın P0 özellikleri (dosya yükleme + AI analiz, çok turlu sohbet/tartışma, emsal karar arama) somut, anlaşılır dille anlatılır
- Kabul kriterleri:
  - [ ] Her özellik için kısa başlık + açıklama + görsel/ikon
  - [ ] "Yakında" (dilekçe üretimi, UYAP entegrasyonu gibi Faz 2/3/6 özellikleri) ayrıca ve net şekilde işaretlenir — henüz var olmayan bir şey "mevcut" gibi sunulmaz

**P0-3: Demo Talebi / İletişim Formu**
- Ziyaretçi ad, e-posta, (opsiyonel) baro sicil no ve kısa mesaj alanlarıyla form doldurur
- Kabul kriterleri:
  - [ ] Form gönderimi başarılı olduğunda ziyaretçiye net bir onay mesajı gösterilir
  - [ ] Gönderilen talep, iş sahibinin görebileceği bir yere ulaşır (e-posta bildirimi ve/veya basit bir veritabanı kaydı)
  - [ ] Zorunlu alan doldurulmazsa anlaşılır bir hata mesajı gösterilir
  - [ ] Form spam/bot doldurmalarına karşı temel bir korumaya sahiptir (örn. honeypot alanı veya rate limiting)

**P0-4: Marka Kimliği Uygulaması**
- Site, AyrisLegal logosu (`public/branding/logo-mark.png` kaynaklı) ve lacivert/teal renk paletiyle tutarlı görünür
- Kabul kriterleri:
  - [ ] Logo header'da ve favicon'da kullanılır
  - [ ] Renk paleti (lacivert arka plan/teal vurgu) ana uygulamanın markasıyla tutarlıdır
  - [ ] Archivo font ailesi (veya markaya uygun bir alternatif) kullanılır

**P0-5: Mobil Uyumluluk**
- Site mobil tarayıcılarda düzgün görüntülenir ve kullanılabilir
- Kabul kriterleri:
  - [ ] 375px genişliğinden itibaren layout bozulmaz, yatay scroll oluşmaz
  - [ ] Form mobilde doldurulabilir ve gönderilebilir

**P0-6: Temel Sayfa Yapısı**
- Ana Sayfa, Özellikler, İletişim/Demo (form) — en az bu üç bölüm tek sayfa (single-page) veya ayrı route olarak mevcut
- Kabul kriterleri:
  - [ ] Navigasyon (header menü veya scroll-link) ile bölümler arası geçiş yapılabilir
  - [ ] Sayfa 3 saniyenin altında yüklenir (temel performans beklentisi)

### Nice-to-Have (P1)

- Hakkımızda/Ekip bölümü (kurucu hikayesi, güven inşası için)
- Basit SSS (Sık Sorulan Sorular) bölümü — özellikle veri güvenliği/gizlilik soruları
- Fiyatlandırma bölümü (sabit 40.000 TL/yıl fiyat noktasını netleştirmeden önce "Fiyat için iletişime geçin" şeklinde belirsiz bırakılabilir)
- Basit analitik entegrasyonu (kaç ziyaretçi, hangi sayfadan form doldurdu gibi temel ölçüm)
- Ekran görüntüsü/kısa demo videosu galerisi

### Future Considerations (P2)

- Blog / SEO içerik stratejisi
- Çoklu dil desteği
- Self-serve deneme/kayıt akışı (ana uygulamanın lisans/ödeme altyapısı olgunlaştığında)
- Müşteri referansları / vaka analizleri (yeterli pilot kullanıcı biriktikten sonra)
- Canlı destek/chatbot

---

## 6. Başarı Metrikleri

**Leading (hızlı değişen göstergeler):**
- Form doldurma oranı (ziyaretçi → demo talebi): hedef ilk ayda ölçülebilir bir taban çizgisi oluşturmak (belirli bir yüzde hedefi için trafik verisi birikmesi bekleniyor)
- Sayfa yüklenme süresi: hedef <3 saniye
- Mobil ziyaretçi oranı ve mobil form tamamlama oranı

**Lagging (zamanla gelişen göstergeler):**
- Form üzerinden gelen taleplerden gerçek pilot kullanıcıya dönüşüm oranı
- Ana uygulama PRD'sindeki "ilk 2 ayda 1.000 ödeyen kullanıcı" hedefine sitenin katkısı (form → pilot → ödeyen kullanıcı hunisi)

**Ölçüm yöntemi:** MVP aşamasında resmi analitik altyapısı yok (P1'de temel analitik eklenmedikçe); form gönderimleri ve basit ziyaretçi sayısı takip edilecek.

---

## 7. Açık Sorular

- **[Ürün]** Demo talebi formu hangi bilgileri toplamalı — sadece ad/e-posta yeterli mi, yoksa büro büyüklüğü/ihtiyaç türü gibi niteleyici sorular eklensin mi (satış önceliklendirmesi için faydalı olabilir ama form uzarsa tamamlanma oranı düşebilir)?
- **[Mühendislik]** Form gönderimleri nereye düşecek — basit bir e-posta servisi (örn. Resend/SendGrid) mi, yoksa `laawos-backend`'e yeni bir endpoint mi eklenecek (mevcut Supabase altyapısına bir `leads`/`demo_requests` tablosu eklemek mantıklı olabilir)?
- **[Ürün]** Fiyatlandırma sitede hiç gösterilsin mi, yoksa "Fiyat için iletişime geçin" şeklinde mi bırakılsın? Ana PRD'de 40.000 TL/yıl fiyat noktası henüz "satış denemeleriyle doğrulanacak" aşamada.
- **[Tasarım]** Site, ana uygulamanın kendi `page.tsx`'indeki inline-style tabanlı tasarım sistemini mi (aynı `DS` token yaklaşımı) paylaşacak, yoksa bağımsız bir stack (örn. Next.js + Tailwind, ayrı bir repo) mi kullanılacak?
- **[Hukuki]** Sitede "yakında" olarak işaretlenecek özellikler (dilekçe üretimi, UYAP entegrasyonu) ile ilgili herhangi bir zaman taahhüdü verilmeli mi, yoksa tarihsiz mi bırakılsın?

---

## 8. Teknik Notlar

- **Stack önerisi:** Next.js (statik export veya basit hosting), ana uygulamayla aynı marka varlıklarını (`public/branding/logo-mark.png`, `logo-branding.png`) paylaşabilir. Bağımsız bir repo olarak kurulması (ana Electron uygulamasından ayrı deploy edilebilmesi için) önerilir.
- **Deploy:** `coolify-deploy` skill'iyle uyumlu olacak şekilde, Gitea reposundan Coolify'a otomatik build — ana backend ile aynı altyapı deseni.
- **Form backend'i:** Basit bir POST endpoint (yeni veya `laawos-backend`'e eklenen bir route) veya üçüncü taraf form servisi (Formspree, Resend) — Açık Sorular §7'de karar bekliyor.
- **SEO temelleri:** Meta title/description, Open Graph görselleri (logo/marka görseliyle), temel semantik HTML — P0 kapsamında minimum, P2'de genişletilebilir.

---

## 9. Zaman Çizelgesi

| Faz | Süre | Bu PRD'nin Kapsamı |
|---|---|---|
| Faz 1 — Tanıtım Sitesi MVP (bu doküman) | Birkaç gün | P0-1 → P0-6 |
| Faz 2 — Güven/İçerik Katmanı | Sonrası | P1 maddeleri (SSS, Hakkımızda, fiyatlandırma netleşmesi) |
| Faz 3 — Büyüme/SEO | Ayrı PRD gerekir | P2 maddeleri (blog, self-serve, çoklu dil) |

**Bağımsızlık notu:** Bu site, ana AyrisLegal uygulamasının geliştirme sürecinden bağımsız olarak paralel yürütülebilir; tek bağımlılığı marka varlıklarının (logo, renk paleti) hazır olmasıdır — ki zaten mevcut.
