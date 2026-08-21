# Ceza Muhakemesi & Hukuk Mahkemeleri Referanslarının AI Analizlerine Entegrasyonu

**Tarih:** 2026-08-18
**Değişen dosyalar:** `laawos-backend/src/controllers/document.controller.ts`, `laawos-backend/src/controllers/drafting.controller.ts`
**Kaynak referanslar:** [`ceza_muhakemesi_rehberi.md`](./ceza_muhakemesi_rehberi.md), [`turk_hukuk_mahkemeleri_sistem_rehberi.md`](./turk_hukuk_mahkemeleri_sistem_rehberi.md)

## Ne yapıldı

İki referans dokümanından (verdiğin ceza muhakemesi süreç/evrak/hüküm rehberi ve hukuk mahkemeleri sistem rehberi) özetlenmiş iki sabit metin bloğu oluşturuldu ve AI'ye gönderilen ilgili sistem promptlarının içine gömüldü:

- **`CEZA_MUHAKEMESI_REFERANSI`** — soruşturma/kovuşturma işlem sırası, ceza mahkemelerinde kullanılan evrak türleri (tensip zaptı, müzekkere, tutanak, gerekçeli karar vb.) ve CMK m.223'e göre hüküm/karar türleri (beraat, mahkûmiyet, CYOK, HAGB, görevsizlik/yetkisizlik/durma vb.).
- **`HUKUK_MAHKEMELERİ_REFERANSI`** — 9 hukuk mahkemesi türü (Asliye Hukuk, Sulh Hukuk, Aile, Asliye Ticaret, İş, Tüketici, İcra Hukuk, Fikri ve Sınai Haklar, Kadastro), her birinin görev alanı, yargılama usulü (yazılı/basit, dilekçe sayısı) ve zorunlu arabuluculuk şartları.

Her iki blok da kendi başlığında **"Dosya bu türdeyse kullan, değilse yok say"** talimatı taşıyor — yani sistemde davanın ceza mi hukuk mu olduğuna dair kod seviyesinde bir ön sınıflandırma/etiketleme YOK. AI, kendisine gönderilen dosya metnini okuyup hangi referansın (varsa) ilgili olduğuna kendisi karar veriyor. Bu bilinçli bir tercih: rijit bir "dava türü tespiti" adımı eklemek yerine, modelin zaten yapması gereken okuma/anlama işine güveniliyor.

## Sistem nasıl çalışacak

Önceden bu 4 analiz özelliği dosya metnini doğrudan modele veriyordu; model, ceza/hukuk usul bilgisini yalnızca kendi eğitim verisinden (parametrik bilgisinden) çıkarıyordu. Artık her istek gönderiminde, dosya metninden önce bu referans bloklar da promptun içinde gidiyor — yani model artık "hatırlamaya" değil, doğrudan **verilen referansa** bakarak cevap üretiyor. Bu özellikle şu noktalarda fark yaratır:

- **Aşama tespiti** ("Görevsizlik Kararı Verildi", "Kovuşturma Aşaması", "Ön İnceleme" gibi) artık doğru terminolojiyle ve doğru sırayla eşleşiyor.
- **Evrak sınıflandırması** (bir belgenin "tensip zaptı" mı "ara karar" mı olduğu gibi) referanstaki tanımlara göre yapılıyor.
- **Hüküm/karar türü yorumlama** (CMK m.223 kapsamındaki 6 hüküm türü + usule ilişkin kararlar) artık kanundaki gerekçelerle birebir eşleşiyor.
- **Strateji önerileri**, hangi mahkeme türünde olunduğuna göre (örn. zorunlu arabuluculuk şartı olan bir İş/Tüketici/Ticaret davasında mı, yoksa böyle bir şart olmayan bir davada mı olunduğu) daha isabetli hale geliyor.

Performans/maliyet etkisi: her istekte prompta ek olarak ~250-400 kelime (yaklaşık 400-600 token) ekleniyor. Bu, mevcut 1500-2500 token'lık `numPredict` bütçelerinin yanında ihmal edilebilir düzeyde.

## Hangi bölgeler etkilendi (kullanıcının gördüğü ekranlar)

İlk turda 4 ekrana eklenmişti; senin "diğer ekranlara da ekle" isteğinle kapsam genişletildi — artık dosya metniyle çalışan **hemen hemen her** AI özelliği bu referansları görüyor:

| Uygulama İçi Ekran/Buton | Backend Endpoint | Backend Fonksiyonu | Ceza Referansı | Hukuk Referansı |
|---|---|---|---|---|
| **Dosya Özeti** | `POST /cases/:caseId/summarize` | `runCaseNarrativeAnalysis` | ✅ | ✅ |
| **🩺 Dosya Röntgeni** (usul aşaması + eksiklik tespiti) | `POST /cases/:caseId/analyze-deficiencies` | `runDeficiencyAnalysis` | ✅ | ✅ |
| **🕵️‍♂️ İfade & Çelişki Avcısı** | `POST /cases/:caseId/analyze-statements` | `runStatementAnalysis` | ✅ | ✅ |
| **⚔️ Dava Stratejisi** | `POST /cases/:caseId/analyze-strategy` | `runStrategyAnalysis` | ✅ | ✅ |
| **Uzlaşma / Arabuluculuk Analizi** (kazanma olasılığı, pazarlık marjı) | `POST /cases/:caseId/analyze-mediation` | `runMediationAnalysis` | ✅ | ✅ |
| **Dilekçe Taslağı** ("AI ile Taslak Oluştur") | `POST /drafting/generate` | `generateDraft` → `DRAFT_SYSTEM_PROMPT` | ✅ | ✅ |
| İlk yükleme analizi (belge yüklenince arka planda çalışan ön-tarama) | `runDocumentAnalysis` (`ANALYSIS_SYSTEM_PROMPT`) | ✅ | ✅ |
| İddianame ön-analizi (Dosya Özeti dosyada iddianame bulursa önce bunu çalıştırıyor) | `runIddianameAnalysis` (`IDDIANAME_SYSTEM_PROMPT`) | ✅ | ❌ *(iddianame kavramsal olarak sadece ceza davasına ait bir belge — hukuk mahkemesi hiç iddianame düzenlemez)* |

## Kasıtlı olarak dışarıda bırakılan tek özellik

| Özellik | Fonksiyon | Neden dahil edilmedi |
|---|---|---|
| **Angarya** (Süre Tutum, Mazeret, Vekaletname Sunma) | `generateAngarya` → `ANGARYA_SYSTEM_PROMPT` | Aracın kendi tanımı gereği "hiçbir hukuki tartışmaya girme" diyor — sadece mahkeme adı/esas no/taraf/vekil doldurup standart 2-3 cümlelik bir metin üretiyor. Usul/mahkeme referansı bu kısa idari belgeler için işlevsel bir fayda sağlamıyor, sadece prompt şişirir. **İstersen buraya da ekleyebilirim** — ama şu an bilinçli olarak dışarıda tutuldu, tesadüfen unutulmadı. |

## Sistem nasıl çalışacak

Önceden bu analiz özellikleri dosya metnini doğrudan modele veriyordu; model, ceza/hukuk usul bilgisini yalnızca kendi eğitim verisinden (parametrik bilgisinden) çıkarıyordu. Artık her istek gönderiminde, dosya metninden önce bu referans bloklar da promptun içinde gidiyor — yani model artık "hatırlamaya" değil, doğrudan **verilen referansa** bakarak cevap üretiyor. Bu özellikle şu noktalarda fark yaratır:

- **Aşama tespiti** ("Görevsizlik Kararı Verildi", "Kovuşturma Aşaması", "Ön İnceleme" gibi) artık doğru terminolojiyle ve doğru sırayla eşleşiyor.
- **Evrak sınıflandırması** (bir belgenin "tensip zaptı" mı "ara karar" mı olduğu gibi) referanstaki tanımlara göre yapılıyor.
- **Hüküm/karar türü yorumlama** (CMK m.223 kapsamındaki 6 hüküm türü + usule ilişkin kararlar) artık kanundaki gerekçelerle birebir eşleşiyor.
- **Strateji ve uzlaşma önerileri**, hangi mahkeme türünde olunduğuna göre (örn. zorunlu arabuluculuk şartı olan bir İş/Tüketici/Ticaret davasında mı, yoksa böyle bir şart olmayan bir davada mı olunduğu) daha isabetli hale geliyor.
- **Dilekçe taslakları**, doğru mahkeme türü/usul terminolojisiyle yazılıyor.

Her iki blok da kendi başlığında **"Dosya bu türdeyse kullan, değilse yok say"** talimatı taşıyor — sistemde davanın ceza mi hukuk mu olduğuna dair kod seviyesinde bir ön sınıflandırma/etiketleme YOK, AI kendisi karar veriyor.

Performans/maliyet etkisi: her istekte prompta ek olarak ~250-500 kelime (yaklaşık 400-800 token, iki referans birden gittiğinde) ekleniyor. Bu, mevcut 500-2500 token'lık `numPredict` bütçelerinin yanında ihmal edilebilir düzeyde — en hafif etkilenen `generateAngarya` zaten bu referansları almıyor.

## Doğrulama durumu

- TypeScript derlemesi (`npx tsc --noEmit`) her iki dosya için de temiz geçti.
- Kod, `laawos-backend` main branch'ine push edildi:
  - `6202aad` — ceza referansı, ilk 4 ekran
  - `63eba80` — hukuk referansı, ilk 4 ekran
  - `7c76913` — kapsam genişletme: ilk yükleme analizi, iddianame ön-analizi, Çelişki Avcısı'na hukuk referansı, Uzlaşma/Arabuluculuk, Dilekçe Taslağı
- **Henüz uçtan uca (gerçek bir dava dosyasıyla) test edilmedi** — bir sonraki adım olarak, hem bir ceza dosyası hem bir hukuk dosyası üzerinde bu ekranların çıktısını gözlemleyip referans bilgisinin doğru şekilde yansıdığını teyit etmek gerekiyor.
