# AyrisLegal — Proje Özeti

_Son güncelleme: 2026-08-09_

## Ürün

**AyrisLegal**, Türk avukatlar için yapay zeka destekli masaüstü hukuki çalışma alanı (Electron + Next.js). Dava dosyası yönetimi, AI ile sohbet/analiz, emsal karar arama (Yargı-MCP üzerinden), dilekçe hazırlama, duruşma takvimi ve UYAP evrak entegrasyonunu tek uygulamada birleştiriyor.

## Repo Haritası

| Repo | Yol | Rol |
|---|---|---|
| **laawos** | `~/Github/laawos` | Electron + Next.js masaüstü uygulaması (frontend + Electron main process) |
| **laawos-backend** | `~/Github/laawos-backend` | Express/TS API — Supabase, AI model çağrıları, iş mantığı |
| **avukat-dosya-indirici** | `~/Github/avukat-dosya-indirici` | Chrome eklentisi — UYAP'tan evrak indirir |
| **yargi-mcp** | `~/Github/yargi-mcp` | Türk hukuk veritabanları için MCP sunucusu (Yargıtay, Danıştay, AYM, vb.) — `api.yargimcp.com`'da production'da, laawos-backend bunu `search`/precedent-analysis için kullanıyor |

## Mimari (özet)

- **Supabase**: Postgres + Auth + RLS. Ana tablolar: `profiles`, `cases`, `documents`, `analyses`, `chat_messages`, `events`.
- **Backend**: Tüm yazma/silme işlemleri (case create/delete, chat delete, local doküman kaydı) `service_role` ile backend üzerinden yapılıyor — RLS'i frontend anon client'ından bypass etmek riskli olduğu için.
- **AI**: RunPod barındırılan "mizan-fixed" model (`/api/chat` ve `/v1/chat/completions`).
- **Yerel dosya mimarisi (gizlilik gereği)**: UYAP eklentisi → Electron'un yerel HTTP köprüsü (`127.0.0.1:4756`) → dosya `userData/dosyalar/` altına yazılır (asla sunucuya gitmez) → OCR/metin çıkarımı yerelde (tesseract.js, officeparser, adm-zip, custom UDF parser) → **sadece çıkarılan metin** backend'e gönderilir (`POST /api/documents/register-local`).

## Bu Oturumda Yapılanlar

1. **yargi-mcp**: Bedesten arama relevance bug'ı düzeltildi (exact-phrase quote yerine `+kelime` AND-terms), commit `47ca4cc`.
2. **Sohbet başlığı otomasyonu**: İlk mesajdan sonra AI başlığı otomatik üretiyor (`generateCaseTitle`).
3. **Marka/tema**: AyrisLegal branding + açık/koyu tema toggle (CSS custom properties, `next/script` ile FOUC'suz init).
4. **Karar Arama Motoru**: İçtihat Arama sayfası yeniden tasarlandı (büyük textarea, mahkeme filtreleri, analiz modu), sahte "%95 eşleşme" skoru kaldırıldı.
5. **Yerel dosya + eklenti entegrasyonu** (büyük iş, plan onaylanarak yapıldı):
   - Eklentiye "AyrisLegal'e Aktar" modu eklendi (mevcut indirme akışlarını bozmadan).
   - Electron'da yerel HTTP sunucu, dosya kaydetme, OCR/metin çıkarma kütüphaneleri (`electron/lib/*`).
   - Backend'de `POST /api/documents/register-local`.
6. **Dava Dosyaları & Takvim gerçek veriye bağlandı**:
   - `Cases()` artık gerçek Supabase verisi kullanıyor, tıklanınca `CaseDetail` (belgeler + AI analiz özeti) açılıyor.
   - `CalendarView()`'a liste/ay-görünümü toggle'ı, gerçek `events` tablosu, etkinlik oluşturma/silme, Google Takvim + iCal (.ics) ekleme butonları eklendi.
7. **Bug fix — "sohbet, dava dosyası gibi görünüyor"**: Sohbet ekranındaki "Yeni Sohbet" butonu bir `cases` satırı oluşturduğu için (chat geçmişi case_id'ye bağlı), her yeni sohbet Dava Dosyaları listesinde de görünüyordu. `cases` tablosuna `kind` kolonu eklendi (`'case'` vs `'chat'`), Dava Dosyaları artık sadece `kind='case'` olanları listeliyor.

## Bekleyen / Kullanıcı Aksiyonu Gereken

- [ ] **Supabase SQL Editor**'da çalıştırılması gerekenler (sırayla):
  - `laawos/sql/2_events.sql` — takvim etkinlikleri tablosu
  - `laawos/sql/3_case_kind.sql` — sohbet/dosya ayrımı (**önemli**, aksi halde her yeni sohbet dosya listesinde görünmeye devam eder)
  - Migration sonrası, bug'dan önce oluşmuş "sahte dosya" kaydı (`Basit yaralama suçuna ilişkin genel hukuki bilgiler`) Supabase Table Editor'dan elle silinmeli/kind='chat' yapılmalı.
- [ ] **laawos-backend push + Coolify redeploy** — `case.controller.ts`'deki `kind` desteği dahil, henüz push edilmedi (onay bekleniyor).
- [ ] **avukat-dosya-indirici**: `background.js/content.js/manifest.json/popup.html/popup.js` değişiklikleri hâlâ commit edilmedi (onay bekleniyor). Kullanıcı UYAP ile "AyrisLegal'e Aktar" akışını kendi test edecek.
- [ ] **UDF parser** (`electron/lib/parseUdf.js`) gerçek bir UYAP UDF dosyasıyla test edilmedi — best-effort, örnek dosyayla doğrulama gerekiyor.
- [ ] `laawos` reposunda hiç commit/push yapılmadı — tüm frontend/Electron değişiklikleri şu an sadece diskte. `dist/` klasörü altında eski bir build'in git'e track edildiği görülüyor (`git status` çok sayıda `dist/mac-arm64/...` farkı gösteriyor) — bu muhtemelen yanlışlıkla commit edilmiş bir build çıktısı, ileride `.gitignore`'a eklenmesi değerlendirilebilir.

## Önemli Tasarım Kararları (unutulmasın)

- Ham UYAP evrakları **asla** sunucuya/Supabase Storage'a yüklenmiyor — sadece yerelde (`userData/dosyalar/`) ve backend'e yalnızca çıkarılan metin gidiyor. Google Drive entegrasyonu ileride opsiyonel olacak.
- Mutating Supabase işlemleri (case/chat silme, case oluşturma) frontend'den değil backend `service_role` üzerinden yapılıyor (RLS güvenilirliği için).
- `caseId === 'general'` sentinel, case-ownership kontrolünden muaf (genel/dosyasız sohbet için).
