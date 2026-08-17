# Otomatik Duruşma ve Süre Takvimi Özelliği (Kesin Süre Avcısı)

Dava dosyasına yüklenen evraklardaki (tensip zaptı, duruşma zaptı vb.) duruşma tarihlerini ve kesin süreleri otomatik tespit edip, dosyaya ait bir "Duruşma ve Süre Takvimi" (Timeline) oluşturma planı.

## User Review Required

> [!IMPORTANT]
> - Veritabanına yeni bir tablo (`case_events`) eklenmesi gerekecektir.
> - Yapay zekaya (LLM) belgelerden tarih çekmesi için verdiğimiz komutu güncelleyeceğiz. Çıkarılan bu tarihler otomatik olarak takvime düşecek. Yanlış tarih tespitine karşı takvim üzerinden sonradan silme/düzenleme özelliği de isteniyor mu, yoksa sadece otomatik tespit mi edelim? (Şu anki planda otomatik tespit ve listeleme var).

## Proposed Changes

### Veritabanı (Supabase)

#### [NEW] `sql/16_case_events_table.sql`
- Yeni `case_events` tablosu oluşturulacak:
  - `id` (uuid)
  - `case_id` (uuid)
  - `document_id` (uuid, nullable)
  - `event_date` (timestamptz)
  - `title` (text)
  - `event_type` (text: 'hearing', 'deadline', 'other')
- Ana şema `sql/1.sql` güncellenecek.

### Backend (laawos-backend)

#### [MODIFY] `src/controllers/document.controller.ts`
- `ANALYSIS_SYSTEM_PROMPT` güncellenerek modelden `events` (dizi) formatında `{"date": "YYYY-MM-DD", "title": "...", "type": "hearing|deadline"}` döndürmesi istenecek.
- `registerLocalDocument` ve `uploadDocument` fonksiyonlarında, eğer model `events` döndürürse bu veriler doğrudan `case_events` tablosuna kaydedilecek.
- (Tarih formatlamalarının geçerli bir `timestamptz` verisine dönüştürülüp veritabanına atılması sağlanacak).

### Frontend (laawos)

#### [MODIFY] `src/app/page.tsx`
- `CaseSection` tipine `calendar` (Takvim) eklenecek.
- Sol menüye (navItems) "Takvim & Süreler" adında yeni bir sekme (takvim ikonu ile) eklenecek.
- Bu sekmeye tıklandığında, `case_events` tablosundaki veriler Supabase JS Client ile çekilip kronolojik sıraya göre (Timeline) görsel olarak listelenecek.
- (Yaklaşan tarihler veya geçmiş tarihler görsel olarak farklı renklendirilebilir).

## Verification Plan

### Manual Verification
- Sisteme örnek bir Duruşma Zaptı yüklenecek ("Bir sonraki duruşmanın 15 Kasım 2026 saat 10:00'a bırakılmasına..." yazan).
- "Takvim" sekmesine gidilip yapay zekanın bu tarihi bulup listeye eklediği teyit edilecek.
