# LegalOS — MVP Ürün Gereksinimleri Dokümanı (PRD)

**Versiyon:** v0.1 (MVP)
**Tarih:** Ağustos 2026
**Durum:** Taslak — geliştirme öncesi son inceleme bekliyor

---

## 1. Problem Tanımı

Türkiye'de avukatlar ve hukuk büroları, dava dosyası yönetimi, hukuki araştırma, içtihat arama ve dilekçe hazırlama süreçlerini birbirinden kopuk sistemler arasında yürütüyor. Piyasada bu sorunu çözmeyi iddia eden çok sayıda ürün var (Lawyer Team, Hukukçu.pro, SmartHukuk, KolayOfis, Attornaid ve diğerleri), ancak saha gözlemi bu ürünlerin genel olarak düşük kalitede olduğunu, özellikle AI destekli analiz ve dosya üzerinde gerçek "muhakeme ortağı" deneyimi sunma konusunda zayıf kaldıklarını gösteriyor.

Avukatlar bir dosya üzerinde çalışırken, bir meslektaşıyla tartışıyormuş gibi fikir alışverişi yapabileceği, dosyayı gerçekten anlayan bir AI aracına ihtiyaç duyuyor — pasif bir arama/özet aracı değil, aktif bir düşünce ortağı.

**Kim etkileniyor:** Solo avukatlar ve küçük/orta ölçekli hukuk büroları (MVP aşamasında büro/kurumsal segment ayrımı yapılmıyor).

**Çözülmezse maliyeti:** Avukatlar zaman kaybetmeye, düşük kaliteli araçlara yüksek bedel ödemeye devam eder; pazar boşluğu rakiplerden biri tarafından doldurulabilir.

---

## 2. Hedefler

1. Avukatın yüklediği bir dava dosyasını AI'ın anlamlı biçimde analiz edip yapılandırılmış bir özet çıkarabilmesi
2. Avukatın dosya hakkında AI ile çok turlu, bağlamı koruyan bir "tartışma" yürütebilmesi (soru-cevap değil, karşılıklı muhakeme)
3. MVP'nin 1 hafta içinde çalışır ve gösterilebilir durumda olması
4. Ürünün gerçek avukatlara (eş ve meslektaş çevresi dahil) gösterilip ilk geri bildirimin toplanabilmesi
5. Yıllık 40.000 TL sabit fiyat noktasının satış denemeleriyle doğrulanması

---

## 3. Kapsam Dışı (Non-Goals) — MVP v0.1

| Kapsam Dışı | Neden |
|---|---|
| UYAP entegrasyonu | En yüksek teknik/hukuki risk taşıyan bileşen; ayrı bir faz (Faz 6) olarak planlandı |
| Yargıtay içtihat / RAG arama | Veri toplama süreci ayrı bir teknik iş; Faz 2'de ele alınacak |
| Dilekçe/UDF üretimi | Dosya analizi ve tartışma çekirdek deneyimi kanıtlanmadan eklenmeyecek; Faz 3 |
| Kendi barındırılan model (Mizan-27B self-host) | MVP'de DeepSeek API kullanılacak; üretim ölçeğinde ekonomik ve KVKK gereksinimleri netleştikten sonra geçiş planlanacak |
| Çoklu kullanıcı / büro yönetimi (roller, yetkiler) | MVP tek kullanıcılı senaryoyu hedefliyor; büro fiyatlandırması ve çoklu kullanıcı yönetimi sonraki fazda |
| Mobil uygulama | Electron masaüstü öncelikli; mobil ayrı bir karar gerektirir |

---

## 4. Kullanıcı Hikayeleri

**Birincil persona: Solo/küçük büro avukatı**

- Avukat olarak, bir dava dosyasını (PDF/DOCX) yükleyebilmek istiyorum, böylece AI dosyayı analiz edebilsin.
- Avukat olarak, yüklenen dosyanın yapılandırılmış bir özetini (taraflar, tarihler, hukuki dayanaklar, zayıf/güçlü noktalar) görebilmek istiyorum, böylece dosyaya hızlıca hakim olabileyim.
- Avukat olarak, dosya hakkında AI ile çok turlu bir sohbet yürütebilmek istiyorum ("bu argümanı kullansam nasıl olur", "karşı taraf şunu iddia ederse ne derim"), böylece bir meslektaşla tartışıyormuş gibi fikrimi netleştirebileyim.
- Avukat olarak, AI'ın önerdiği noktaların hangi belgeye/bölüme dayandığını görebilmek istiyorum, böylece güvenilirliğini değerlendirebileyim.
- Avukat olarak, birden fazla dosyayı ayrı ayrı yönetebilmek istiyorum, böylece farklı davalarımı karıştırmayayım.
- Avukat olarak (edge case), AI'ın emin olmadığı noktalarda bunu açıkça belirtmesini istiyorum, böylece yanlış güvenle hareket etmeyeyim.

---

## 5. Gereksinimler

### Must-Have (P0)

**P0-1: Dosya Yükleme**
- Kullanıcı PDF ve DOCX dosyası yükleyebilir
- Taranmış/görüntü tabanlı PDF'ler için OCR desteği
- Kabul kriterleri:
  - [ ] Kullanıcı sürükle-bırak veya dosya seçici ile PDF/DOCX yükleyebilir
  - [ ] 20MB'a kadar dosyalar desteklenir
  - [ ] Yükleme sırasında ilerleme göstergesi görünür
  - [ ] Desteklenmeyen format/boyut için anlaşılır hata mesajı gösterilir

**P0-2: AI Dosya Analizi**
- Yüklenen dosya DeepSeek API'ye gönderilir, yapılandırılmış özet üretilir (taraflar, tarihler, hukuki dayanaklar, ilk değerlendirme)
- Kabul kriterleri:
  - [ ] Analiz tamamlandığında yapılandırılmış özet ekranda gösterilir
  - [ ] Analiz süresi kullanıcıya bir bekleme göstergesiyle iletilir
  - [ ] API hatası durumunda kullanıcı bilgilendirilir, tekrar deneme seçeneği sunulur

**P0-3: Dosya Üzerinde Tartışma (Sohbet)**
- Kullanıcı, analiz edilen dosya bağlamında AI ile çok turlu sohbet edebilir
- Sohbet geçmişi dosya oturumu boyunca korunur
- Kabul kriterleri:
  - [ ] Kullanıcı serbest metin soru/yorum yazabilir
  - [ ] AI yanıtı dosya içeriğine referansla verir
  - [ ] Önceki sohbet turları bağlam olarak korunur (oturum kapanana kadar)
  - [ ] AI, emin olmadığı noktalarda belirsizliği açıkça ifade eder

**P0-4: Temel Dosya Yönetimi**
- Kullanıcı birden fazla dosyayı ayrı kayıtlar olarak saklayıp arasında geçiş yapabilir
- Kabul kriterleri:
  - [ ] Dosya listesi görünümü mevcuttur
  - [ ] Her dosya kaydı adlandırılabilir
  - [ ] Bir dosyaya dönüldüğünde önceki analiz ve sohbet geçmişi görüntülenir

**P0-5: Electron Masaüstü Uygulaması**
- Uygulama Windows ve macOS'ta çalışan bir Electron masaüstü uygulaması olarak paketlenir
- Kabul kriterleri:
  - [ ] Uygulama kurulum paketi (installer) üretilebilir
  - [ ] Temel navigasyon (dosya listesi ↔ dosya detay/sohbet ekranı) çalışır

### Nice-to-Have (P1)

- Dosya içi arama (yüklenen belge metninde anahtar kelime arama)
- Sohbet geçmişini dışa aktarma (metin/PDF olarak)
- Karanlık/aydınlık tema seçeneği
- Analiz sonucunu düzenleyip not ekleyebilme

### Future Considerations (P2)

- Yargıtay içtihat / RAG entegrasyonu (Faz 2)
- Dilekçe/UDF üretimi (Faz 3)
- UYAP entegrasyonu (Faz 6)
- Mizan-27B self-host geçişi
- Çoklu kullanıcı / büro yönetimi, rol bazlı yetkilendirme
- Mobil uygulama

---

## 6. Başarı Metrikleri

**Leading (hızlı değişen göstergeler):**
- Dosya yükleme → analiz tamamlama oranı: hedef %90+ (teknik başarısızlık oranı düşük olmalı)
- Ortalama sohbet turu sayısı / dosya: gerçek "tartışma" davranışının göstergesi (hedef: 3+ tur)
- Analiz süresi: hedef 60 saniye altı

**Lagging (zamanla gelişen göstergeler):**
- Pilot avukatlardan olumlu sözlü/yazılı geri bildirim oranı
- 40.000 TL/yıl fiyat noktasına "evet" diyen pilot kullanıcı sayısı
- İlk 2 ay içinde ödeyen kullanıcı sayısı (hedef: 1.000 — bkz. LegalOS Yol Haritası ve Plan dokümanı)

**Ölçüm yöntemi:** MVP aşamasında resmi analitik altyapısı yok; pilot kullanıcılarla doğrudan görüşme ve basit kullanım logları üzerinden takip edilecek.

---

## 7. Açık Sorular

- **[Mühendislik]** DeepSeek API'ye gönderilen dosya içeriğinin (hassas müvekkil verisi) KVKK açısından nasıl ele alınacağı netleşmedi — MVP'de gerçek müvekkil verisi mi, anonimleştirilmiş test verisi mi kullanılacak?
- **[Ürün]** OCR için ayrı bir model mi kullanılacak yoksa DeepSeek'in kendi görsel işleme kapasitesi mi değerlendirilecek?
- **[İş]** Büro/kurumsal fiyatlandırma modeli (kullanıcı başına çarpım mı, sabit paket mi) henüz belirlenmedi.
- **[Mühendislik]** Sohbet oturumu ne kadar süreyle "hafızada" tutulacak — dosya kapatılıp yeniden açıldığında geçmiş korunacak mı, korunacaksa nerede saklanacak (yerel mi, sunucu tarafı mı)?
- **[Ürün]** Yanlış/halüsinasyonlu AI çıktısı için kullanıcıya nasıl bir uyarı/disclaimer gösterilecek?

---

## 8. Zaman Çizelgesi

| Faz | Süre | Bu PRD'nin Kapsamı |
|---|---|---|
| Faz 1 — Çekirdek MVP (bu doküman) | 1 hafta | P0-1 → P0-5 |
| Faz 2 — RAG / İçtihat | 2 hafta | Kapsam dışı, ayrı PRD gerekir |
| Faz 3 — Dilekçe Üretimi | 1 hafta | Kapsam dışı, ayrı PRD gerekir |
| Faz 4 — Test/Sertleştirme | 1 hafta | Bu PRD'nin P0 gereksinimlerinin stabilizasyonu |
| Faz 5 — Satış / Kullanıcı Kazanımı | Sürekli | Kapsam dışı |
| Faz 6 — UYAP Entegrasyonu | Paralel/sonraki | Kapsam dışı, ayrı PRD gerekir |

**Bağımlılık:** Bu PRD, DeepSeek API erişiminin (API anahtarı, rate limit) geliştirme başlamadan önce hazır olmasını varsayar.

**Not:** Genel iş planı, maliyet/gelir varsayımları ve uzun vadeli yol haritası için bkz. *LegalOS Yol Haritası ve Plan* dokümanı.