# LegalOS Backend — Ürün Gereksinimleri Dokümanı (PRD)

**Versiyon:** v0.1 (MVP)
**Tarih:** Ağustos 2026
**Durum:** Taslak — geliştirme öncesi son inceleme bekliyor
**İlgili doküman:** LegalOS MVP PRD (ana uygulama), LegalOS Yol Haritası ve Plan

---

## 1. Problem Tanımı

LegalOS Electron uygulaması, dosya analizi ve AI ile tartışma özelliklerini DeepSeek API üzerinden sunuyor. Bu API çağrılarının istemci (Electron) tarafından doğrudan yapılması, üç somut riski beraberinde getiriyor:

1. **Anahtar sızıntısı** — API anahtarı istemci koduna gömülürse, uygulama paketi (`.asar`) açılarak çıkarılabilir; sınırsız, izlenemeyen kullanım riski oluşur
2. **Kontrolsüz maliyet** — Kullanıcı başına kullanım sınırlanamaz, kötü niyetli veya hatalı bir istemci faturayı öngörülemez şekilde büyütebilir
3. **Lisans kontrolünün atlanabilir olması** — İstemci tarafında yapılan lisans kontrolü, uygulama patch'lenerek devre dışı bırakılabilir

**Çözüm:** DeepSeek API çağrılarının ve lisans doğrulamasının geçtiği, Coolify üzerinde barındırılan ince bir backend servisi (proxy).

**Kim etkileniyor:** Doğrudan son kullanıcı (avukat) bu servisi görmez — arka planda çalışır. Etkilenen taraf, iş sahibi (Mustafa) açısından maliyet kontrolü ve IP koruması.

---

## 2. Hedefler

1. DeepSeek API anahtarının hiçbir zaman istemci tarafına (Electron uygulamasına) ulaşmaması
2. Her isteğin geçerli bir kullanıcı JWT'si ve aktif lisans ile doğrulanması
3. Kullanıcı başına makul kullanım sınırlarının uygulanması (maliyet kontrolü)
4. Model/sağlayıcı değişikliğinin (DeepSeek → Mizan-27B self-host gibi) istemci güncellemesi gerektirmeden yapılabilmesi
5. Sistem promptlarının (AI'ın "tartışma odaklı" davranışını tanımlayan) istemci tarafında görünmemesi

---

## 3. Kapsam Dışı (Non-Goals) — v0.1

| Kapsam Dışı | Neden |
|---|---|
| Kullanıcı arayüzü / dashboard | Backend saf API servisi; yönetim ihtiyacı olursa Supabase Studio kullanılacak |
| Ödeme işleme (checkout) | Ayrı bir entegrasyon (iyzico vb.); bu PRD sadece lisans *kontrolünü* kapsar, lisans *satışını* değil |
| Model self-host altyapısı (Mizan-27B) | Backend, DeepSeek API'yi çağıran ince bir katman olarak tasarlanıyor; sağlayıcı değişimi ileride bu servisin içinde bir konfigürasyon değişikliği olacak, ayrı bir altyapı projesi değil |
| Çoklu bölge / yüksek erişilebilirlik (HA) | Tek sunucu (Coolify/Hetzner) yeterli; MVP ölçeğinde HA gereksinimi yok |
| Detaylı analitik/BI paneli | Sadece temel loglama; görselleştirme sonraki faz |

---

## 4. Kullanıcı Hikayeleri

**Not:** Bu servisin "kullanıcısı" son kullanıcı değil, Electron istemcisidir. Hikayeler istemci-backend etkileşimi üzerinden yazılmıştır.

- İstemci olarak, kullanıcının JWT'sini backend'e ileterek onun adına DeepSeek analiz isteği yapabilmek istiyorum, böylece anahtar istemcide bulunmaz.
- İstemci olarak, backend'den "lisansınız aktif değil" gibi net bir hata alabilmek istiyorum, böylece kullanıcıya doğru mesajı gösterebileyim.
- Sistem olarak (backend), her isteğin `case_id`'sinin gerçekten o kullanıcıya ait olduğunu doğrulamak istiyorum, böylece bir kullanıcı başkasının dosyasına erişemesin.
- Sistem olarak (backend), bir kullanıcının günlük istek sayısını sınırlamak istiyorum, böylece anormal kullanım maliyeti kontrolsüz büyütmesin.
- İş sahibi olarak, DeepSeek yerine başka bir model/sağlayıcıya geçtiğimde sadece backend'i güncellemek istiyorum, böylece istemci uygulamasını yeniden dağıtmama gerek kalmasın.

---

## 5. Gereksinimler

### Must-Have (P0)

**P0-1: JWT Doğrulama Middleware**
- Her istek, `Authorization: Bearer <token>` header'ı ile gelir
- Token, Supabase Auth üzerinden doğrulanır (`supabase.auth.getUser(token)`)
- Kabul kriterleri:
  - [ ] Geçersiz/süresi dolmuş token → 401 döner
  - [ ] Token yoksa → 401 döner
  - [ ] Geçerli token → `req.userId` set edilir, sonraki adıma geçilir

**P0-2: Lisans Kontrolü**
- Kullanıcının `profiles.license_status` alanı `active` veya geçerli `trial` değilse istek reddedilir
- Kabul kriterleri:
  - [ ] Lisansı süresi dolmuş kullanıcı → 403 + anlaşılır hata mesajı
  - [ ] Aktif lisanslı kullanıcı → sonraki adıma geçilir

**P0-3: Kaynak Sahipliği Doğrulama**
- İstek bir `case_id` içeriyorsa, backend bu dosyanın gerçekten istek yapan kullanıcıya ait olduğunu `service_role` ile kontrol eder (RLS bypass edildiği için bu kontrol backend'in sorumluluğu)
- Kabul kriterleri:
  - [ ] Başkasının `case_id`'si ile istek yapılırsa → 403 döner
  - [ ] Kendi `case_id`'si ile istek yapılırsa → sonraki adıma geçilir

**P0-4: Dosya Analizi Endpoint'i**
- `POST /api/analysis/:caseId` — ilgili dosyanın `extracted_text`'ini alır, DeepSeek'e gönderir, yapılandırılmış özet döner ve `analyses` tablosuna yazar
- Kabul kriterleri:
  - [ ] Başarılı analiz → yapılandırılmış JSON (taraflar, tarihler, dayanaklar, değerlendirme) döner
  - [ ] DeepSeek API hatası → 502 + anlaşılır hata, `analyses`'e yazılmaz
  - [ ] Analiz süresi 60 saniyeyi aşarsa zaman aşımı hatası döner

**P0-5: Sohbet Mesajı Endpoint'i**
- `POST /api/chat/:caseId/message` — kullanıcı mesajını, sohbet geçmişini ve dosya bağlamını DeepSeek'e gönderir, yanıtı döner ve `chat_messages`'a hem kullanıcı mesajını hem AI yanıtını yazar
- Kabul kriterleri:
  - [ ] Sohbet geçmişi (son N mesaj) bağlam olarak DeepSeek'e iletilir
  - [ ] Yanıt başarıyla alınırsa hem kullanıcı mesajı hem AI yanıtı veritabanına kaydedilir
  - [ ] DeepSeek hata verirse kullanıcı mesajı yine de kaydedilir (kullanıcı emeği kaybolmasın), AI yanıtı için hata döner

**P0-6: Kullanım Sınırlama (Rate Limiting)**
- Kullanıcı başına günlük istek sayısı sınırlanır (başlangıç değeri: örn. 50 analiz + 200 sohbet mesajı/gün — pilot geri bildirimiyle ayarlanacak)
- Kabul kriterleri:
  - [ ] Sınır aşıldığında 429 + "günlük kullanım limitine ulaştınız" mesajı
  - [ ] Sınır her gün UTC 00:00'da sıfırlanır

**P0-7: Health Check**
- `GET /health` — Coolify'ın servis durumunu izleyebilmesi için
- Kabul kriterleri:
  - [ ] Servis ayaktaysa 200 + `{status: "ok"}` döner
  - [ ] Supabase bağlantısı koptuysa 503 döner

### Nice-to-Have (P1)

- Basit istek loglama (endpoint, kullanıcı, süre, başarı/hata) — `access_logs` tablosuna yazma
- OCR tetikleme endpoint'i (eğer OCR ayrı bir servis/model gerektiriyorsa)
- DeepSeek yanıt süresi metriği (yavaşlama tespiti için)

### Future Considerations (P2)

- Model sağlayıcı soyutlaması (DeepSeek/Mizan-27B arasında konfigürasyonla geçiş yapabilen bir `ModelProvider` arayüzü)
- Kullanım bazlı faturalama entegrasyonu
- Çoklu bölge / yedekli deploy
- Detaylı analitik dashboard
- Webhook desteği (örn. analiz tamamlandığında bildirim)

---

## 6. Başarı Metrikleri

**Leading:**
- Ortalama yanıt süresi (analiz endpoint'i): hedef <60 saniye
- Hata oranı (5xx): hedef <%2
- JWT/lisans doğrulama nedeniyle reddedilen istek oranı: beklenmedik yükseklikse entegrasyon sorunu işareti

**Lagging:**
- Aylık DeepSeek API maliyeti / aktif kullanıcı sayısı oranı (öngörülebilirlik göstergesi)
- Rate limit'e takılan kullanıcı sayısı (limitlerin doğru kalibre edilip edilmediğinin göstergesi)

---

## 7. Açık Sorular

- **[Mühendislik]** Rate limit değerleri (günlük 50 analiz / 200 mesaj) tamamen tahmini — pilot kullanım verisiyle kalibre edilmeli.
- **[Mühendislik]** Sohbet geçmişi bağlamı kaç mesaja kadar DeepSeek'e gönderilecek (token limiti/maliyet dengesi)?
- **[Ürün]** Rate limit'e takılan kullanıcıya sadece hata mı gösterilecek, yoksa "daha fazla kullanım için iletişime geçin" gibi bir yönlendirme mi olacak?
- **[Mühendislik]** `access_logs` tablosuna yazma her istekte senkron mu olacak, yoksa performansı etkilememesi için asenkron/kuyruk mu kullanılacak?

---

## 8. Teknik Notlar

- **Stack:** Node.js + TypeScript, Express veya Next.js API routes (ikisi de uygun; Next.js seçilirse istemci tarafındaki Next.js koduyla bazı tipler/yardımcı fonksiyonlar paylaşılabilir)
- **Supabase bağlantısı:** `service_role` key ile (RLS bypass, bu yüzden P0-3 sahiplik kontrolü zorunlu)
- **DeepSeek API anahtarı:** Sadece bu servisin ortam değişkenlerinde, asla loglara veya istemciye yazılmaz
- **Deploy:** Coolify, Gitea reposundan otomatik build; `coolify-deploy` skill'i ile uyumlu
- **Sistem promptları:** Kod içinde sabit (hardcoded) değil, ayrı bir config/dosya olarak tutulmalı — ileride A/B test veya hızlı iterasyon için

---

## 9. Zaman Çizelgesi

Bu servis, LegalOS Yol Haritası'ndaki **Faz 1 (Çekirdek MVP, 1 hafta)** kapsamının bir parçasıdır — Electron istemcisiyle paralel geliştirilmesi gerekir, çünkü istemci bu servis olmadan analiz/sohbet özelliklerini kullanamaz.