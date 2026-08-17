# Otomatik Süre ve Kesin Süre Avcısı (Takvim Özelliği)

Özellik başarıyla tamamlandı. Aşağıda yapılan değişikliklerin özeti yer almaktadır.

## Yapılan Değişiklikler

### 1. Veritabanı (Supabase) Hazırlığı
- `laawos/sql/16_case_events_table.sql` adında yeni bir geçiş (migration) dosyası oluşturuldu.
- Bu dosya içerisinde, dava dosyalarındaki tarihleri tutacak `case_events` adında yeni bir tablo tasarlandı.
- Tablo `event_type` sütunu ile 'hearing' (duruşma), 'deadline' (kesin süre) ve 'other' (genel) gibi tipleri desteklemektedir.
- Şema dosyası `1.sql` güncellenerek bu tablo genel şemaya dâhil edildi.
- **DİKKAT:** Uygulamanın düzgün çalışabilmesi için Supabase SQL Editör üzerinden aşağıdaki sorguyu çalıştırmanız gerekmektedir:
  ```sql
  create table case_events (
    id uuid primary key default gen_random_uuid(),
    case_id uuid not null references cases(id) on delete cascade,
    document_id uuid references documents(id) on delete set null,
    event_date timestamptz not null,
    title text not null,
    event_type text not null default 'other',
    created_at timestamptz default now()
  );
  create index idx_case_events_case_id on case_events(case_id);
  ```

### 2. Backend (laawos-backend)
- `document.controller.ts` dosyasındaki yapay zekanın belge analiz komutu (`ANALYSIS_SYSTEM_PROMPT`) güncellendi.
- Artık modelden belge içerisindeki tarihleri düz metin olarak değil, yapılandırılmış bir JSON dizisi (`events: [{ date, title, type }]`) olarak ayıklaması istendi.
- Dönen bu tarihler otomatik olarak tespit edilerek Supabase `case_events` tablosuna kaydedilecek şekilde entegrasyon (otomatik süre avcısı) eklendi.

### 3. Frontend (laawos)
- Dosya içindeki sol menüye (navItems) "Takvim & Süreler" butonu eklendi (takvim ikonuyla birlikte).
- `CaseCalendar` adında yeni bir bileşen yazılarak Supabase'den bu tarihler kronolojik olarak çekildi.
- Geçmiş tarihler hafif silik ve gri olarak, yaklaşan tarihler ise canlı (duruşmalar sarı/turuncu, kesin süreler kırmızı, genel tarihler mavi) bir "timeline" yapısında tasarlandı.

## Nasıl Test Edilir?
1. Supabase'den gerekli SQL komutunu çalıştırın.
2. Sisteme, içerisinde "Bir sonraki duruşma 24 Eylül saat 10:00" veya "İki haftalık kesin süre verildi" gibi ifadeler geçen yeni bir evrak yükleyin (veya var olanları silip baştan yükleyin/analiz ettirin).
3. Dosya Ayrıntıları ekranında sol taraftaki "Takvim & Süreler" menüsüne tıklayın ve tarihlerin oraya otomatik olarak düştüğünü teyit edin.
