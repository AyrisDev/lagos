# Geliştirme Notları ve TODO Listesi

Burada projenin geleceği ve yapacağımız eklemeler için fikirlerimizi, notlarımızı tutacağız. Aklınıza gelen yeni özellikleri veya konuşacağımız diğer konuları buraya ekleyerek takip edebiliriz.

## 📋 Yapılacaklar / Fikirler

- [x] **Müvekkil Kimliği Seçimi (Client Side):**
  - Dava dosyası detayına "Müvekkil: [Şüpheli / Davacı / Davalı vs.]" seçeneği eklenecek.
  - Sistem bu sayede kullanıcının hangi tarafı savunduğunu kalıcı olarak bilecek.

- [x] **Savunma / Dava Stratejisi Oluşturucu:**
  - Dosya Özeti bölümünün yanına yeni bir aksiyon butonu eklenecek (örn: "Strateji Öner").
  - Yapay zekaya özel bir prompt gönderilerek (örn: *"Sen bu dosyadaki şüphelinin müdafiisin. Beraat için zayıf noktaları, usul hatalarını ve toplanması gereken delilleri madde madde strateji olarak sun"*), doğrudan kullanıcının tuttuğu tarafa yönelik **hukuki strateji** üretilmesi sağlanacak.

- [x] **İfade ve Beyan Analizi (Kişi Kartları):**
  - Dosyaya ait "İfade Tutanağı", "Duruşma Zaptı", "Kolluk İfadesi" gibi belgeleri yapay zekaya taratarak; **Tanık, Müşteki, Şüpheli/Sanık** beyanlarının tek bir çatı altında listelenmesi sağlanabilir.
  - Sistemin, her bir kişinin ne dediğini özetlemesi ve ifadeler arasındaki **çelişkileri tespit etmesi** gibi çok değerli bir analiz özelliği eklenebilir.

- [x] **Gelişmiş Şablon Motoru (UDF Klonlama):**
  - Avukat sisteme kendi UDF şablonunu (Örn: Tutukluluğa İtiraz) yüklediğinde, sistem sadece şablonun metnini değil, **sayfa yapısını, maddeleme stilini ve başlık formatlarını (bold, ortalı)** da hafızaya alacak.
  - Yapay zeka sıfırdan bir metin yazmak yerine, avukatın o UDF şablonunu klonlayacak; "AÇIKLAMALAR" ve "SONUÇ" gibi ana başlıkları sabit tutup, aradaki olay örgüsünü ve hukuki savunmayı avukatın tarzına (madde madde ise madde madde, düz ise düz) göre dolduracak.
  - Şablonlara özel "Yapay Zeka Talimatı" eklenebilecek. (Örn: *Bu şablonu kullanırken her zaman AİHM kararlarına atıf yap*).

- [x] **Akıllı Görünüm ("Çöp" Belge Filtresi):**
  - UYAP'tan inen yüzlerce sayfalık dosyadaki posta alındıları, boş müzekkereler ve gereksiz barkodlu sayfalar yapay zeka tarafından arka plana gizlenecek.

- [ ] **Akıllı Dosya Eksiklik Tespiti (Dosya Röntgeni):**
  - Dosya okunduktan sonra sistem bir "eksiklik listesi" çıkaracak. (Örn: *"Tanık X'in ifadesi alınmamış"*, *"HTS kayıtları istenmemiş"*)
  - Sadece olanı özetleyen değil, avukata bir sonraki adımda **ne yapması gerektiğini söyleyen** bir danışman gibi çalışacak.

- [x] **Arabuluculuk & Müzakere Asistanı (Kazanma Olasılığı Analizi):**
  - Dava açılmadan veya arabuluculuk masasına oturmadan önce sistem, eldeki delillere ve güncel içtihatlara bakarak davanın kazanılma/kaybedilme olasılığını hesaplayacak.
  - Avukata: *"Dava açılırsa %60 kaybedersin, masraflarla birlikte zararın X TL olur. Arabuluculukta Y TL'ye anlaşırsan müvekkil için en karlı senaryo budur"* şeklinde matematiksel bir **pazarlık marjı** sunacak.

- [x] **Tanık İfadesi "Yalan Dedektörü" (Çelişki Avcısı):** (Not: Test edilecek)
  - Ceza dosyalarında tanıklar veya şüpheliler kollukta (karakolda) ayrı, savcılıkta ayrı, mahkemede ayrı ifade verirler. 
  - Sistem aynı kişinin 3 farklı aşamadaki ifadesini yan yana koyup yapay zeka ile çapraz analiz yapacak ve çelişkileri tespit edecek.

---
*Not: Duruşma hazırlık raporu, görsel haritalandırmalar, mevzuat radarı gibi özellikler şu an için öncelikli olmadığından listeden çıkarılmıştır.*
