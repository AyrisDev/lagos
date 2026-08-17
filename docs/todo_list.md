# Geliştirme Notları ve TODO Listesi

Burada projenin geleceği ve yapacağımız eklemeler için fikirlerimizi, notlarımızı tutacağız. Aklınıza gelen yeni özellikleri veya konuşacağımız diğer konuları buraya ekleyerek takip edebiliriz.

Aşağıdaki özellikler, uygulamanın teknik zorluk derecesine ve avukata sağlayacağı anlık faydaya (önceliğe) göre fazlara ayrılmıştır.

## 🚀 FAZ 1: Çekirdek İyileştirmeler (Hemen Yapılmalı, Satışı Patlatır)
*Bu özellikler mevcut altyapı ile nispeten hızlı yapılabilir ve avukatın gündelik "angarya" yükünü anında çözer.*

- [x] **UDF Formatında Dilekçe İhracı (Çıktı Alma):**
  - Hazırlanan dilekçelerin doğrudan UYAP'a yüklenebilecek formatta (.udf) indirilmesi sağlandı. (Kalınlık, hizalama, paragraf boşlukları UDF-XML yapısına uygun olarak)
  - `generateUdf.js` motoru yazıldı.
  - Uygulamanın arayüzüne (Frontend) "UDF Olarak İndir" butonu eklendi ve aktif hale getirildi.
- [x] **Gelişmiş Şablon Motoru (UDF Klonlama):**
  - Avukatın kendi UDF şablonunu (başlık, antet, maddeleme stili) bozmadan, yapay zekanın sadece içini doldurması ve şablona özel talimat alabilmesi.
- [x] **Tek Tuş Angarya UDF'leri (Süre Tutum / Mazeret):**
  - Süre tutum, mazeret, vekaletname sunma gibi angarya dilekçelerin tek butona basılarak UYAP'a hazır UDF formatında anında indirilmesi.
- [x] **Akıllı Görünüm ("Çöp" Belge Filtresi):**
  - UYAP'taki yüzlerce e-tebligat alındısı, vekalet pulu, makbuz gibi dosyanın özünü yansıtmayan evrakların yapay zeka ile otomatik "gizlenmesi" (silinmeden sadece göz ardı edilmesi).
- [x] **Müvekkil Kimliği Seçimi:**
  - Dosya detayına "Müvekkil Kimliği: [Şüpheli / Davacı / Davalı]" seçeneği eklenerek yapay zekanın hangi tarafı savunduğunu bilmesi (Doğrudan prompt üzerinden entegre edildi).

## 🕵️‍♂️ FAZ 2: İleri Düzey Dosya Analizi (Uygulamayı Vazgeçilmez Kılar)
*Yapay zekanın okuma ve kıyaslama gücünü tam olarak sahaya yansıtacağı dosya hakimiyeti özellikleri.*

- [x] **İfade Analizi ve "Yalan Dedektörü" (Çelişki Avcısı):**
  - Tanık, Müşteki, Şüpheli beyanlarının kişi bazlı listelenmesi. Aynı kişinin Karakol-Savcılık-Mahkeme ifadelerindeki çelişkilerin fosforlu renkle çizilerek avukata sunulması.
- [ ] **Otomatik Süre ve Kesin Süre Avcısı:**
  - *"Tebliğden itibaren 7 gün içinde"*, *"Kesin süre verilmiştir"* gibi ifadelerin tespit edilerek Duruşma ve Süre Takvimi'ne kırmızı alarm olarak eklenmesi.
- [x] **Akıllı Dosya Eksiklik Tespiti (Dosya Röntgeni):**
  - Dosya okunduktan sonra sistemin bir "eksiklik listesi" (Örn: "Tanık X'in ifadesi alınmamış") çıkarması.
- [ ] **Çoklu Dosya Analizi (İltisak / Çelişki Tespiti):**
  - Aynı olayın Ceza ve Tazminat dosyalarını birbirine bağlayıp iki dosya arasındaki çelişkileri avukata raporlaması.
- [ ] **Görsel Olay Örgüsü ve Kronoloji (Timeline):**
  - HTS kayıtları, baz istasyonları ve beyanlardaki tüm olayların tarih/saat sırasına göre görsel bir zaman çizelgesine dökülmesi.

## ⚖️ FAZ 3: Duruşma, Strateji ve İkna Asistanları (Dijital Ortak)
*Hukuki araştırma, strateji kurma ve mahkemede üstünlük sağlama araçları.*

- [ ] **Hibrit RAG (Yapay Zeka Destekli İçtihat Analizi):**
  - Yargı MCP'den dönen kararların yapay zeka ile filtrelenerek davaya en uygun 2-3 "nokta atışı" kararın bulunması ve hukuki uyum analizi yazılması.
- [x] **Savunma / Dava Stratejisi Oluşturucu:**
  - Dosyanın zayıf noktalarını, usul hatalarını ve toplanması gereken delilleri madde madde "Hukuki Strateji" olarak sunması.
c
- [ ] **Oto-Duruşma Hazırlık Raporu (Hearing Prep Sheet):**
  - Duruşmadan 1 gün önce "Hakim ne sorar, karşı tarafa ne cevap verilmeli, hangi evrak sunulmalı" şeklinde 1 sayfalık özet çıkarılması.
- [x] **Duruşma Esnasında Canlı Arama (Dijital Stajyer):**
  - Duruşma anında "Hastane raporu hangi tarihteydi?" gibi sorulara nokta atışı "12 Ekim 2021, Belge no:45" şeklinde cevap verilmesi.
- [ ] **Emsal Karar "Red Flag" (Güncellik Uyarısı):**
  - Dilekçedeki Yargıtay kararının yakın zamanda İçtihadı Birleştirme Kurulu tarafından bozulup bozulmadığının uyarısı.

## 🚀 FAZ 4: Ofis Otomasyonu & Gelecek Vizyonu (Bilim Kurgu Seviyesi)
*İleriye dönük, uygulamayı sektörde "Tekel" yapacak kompleks özellikler.*

- [ ] **Müvekkil "Ne Oldu?" Raporu (Halk Diline Çeviri):**
  - Gelen belgelerin tek tuşla müvekkilin anlayacağı basit, güven verici bir WhatsApp mesajına çevrilmesi.
- [ ] **Arabuluculuk & Müzakere Asistanı (Kazanma Olasılığı Analizi):**
  - Davanın kazanılma/kaybedilme olasılığını hesaplayıp matematiksel bir "Pazarlık Marjı" (Şu fiyata anlaşırsan karlı çıkarsın) sunması.
- [ ] **Harç ve Masraf Tahminleyici:**
  - Dava değerini okuyarak yatırılması gereken peşin harç ve gider avansını otomatik hesaplaması.
- [ ] **Akıllı İcra ve Haciz Yönlendiricisi:**
  - Takbis/Polnet sorgusu yüklenince "Maaş Haczi Müzekkeresini UDF yapayım mı?" diye sorması.
- [ ] **Görsel İlişki Ağı Haritası (Entity Mind-Map):**
  - MASAK veya örgütlü suç dosyalarındaki para trafiği ve akrabalık ilişkilerini görsel bir haritaya dökmesi.
- [ ] **Hakim ve Mahkeme İstatistiği (Davranış Profili):**
  - Mahkemelerin karar profillerini çıkarıp (Örn: "Ankara 3. İş Mahkemesi tanık sevmez, belge sun") dilekçe taktiği vermesi.
- [ ] **Mevzuat ve AYM İptal Radarı:**
  - İddianamedeki kanun maddeleri AYM tarafından yeni iptal edildiyse anında uyararak avukata usul avantajı sağlaması.
