# Duruşma Esnasında Canlı Arama (Dijital Stajyer)

Duruşma Esnasında Canlı Arama (Dijital Stajyer) özelliği başarıyla tamamlanarak projeye entegre edildi! 🎉

## Neler Yapıldı?

### 1. Backend (laawos-backend)
- `chat.controller.ts` içerisindeki sohbet (chatMessage) mekanizmasına **yeni bir mod (`chat_mode: 'intern'`)** eklendi.
- Bu mod çağrıldığında yapay zekaya özel bir **Sistem Komutu (Prompt)** gönderiliyor:
  - *"Sen bir dijital stajyersin (Canlı Arama Asistanı). Kullanıcı şu anda duruşmada veya acil bir durumda ve senden ÇOK HIZLI, KISA ve NOKTA ATIŞI bir bilgi bekliyor. Asla uzun cümleler kurma, merhaba/nasılsın deme. Yalnızca istenen tarihi, belge adını veya spesifik bilgiyi 1-2 cümleyle ver."*
- Bu sayede yapay zeka normal chat modundaki gibi uzun analizler yapmak yerine, doğrudan soruya ve belgeye odaklanarak saniyeler içinde sadece aranan cevabı verecek şekilde eğitilmiş oldu.

### 2. Frontend (laawos)
- Dosya detayındaki yan menüye `Icon.zap` (şimşek/hızlı ikon) ile **"Dijital Stajyer"** adında yeni bir sekme eklendi.
- `CaseIntern` adında yepyeni bir bileşen oluşturuldu.
  - Bu bileşen, standart "AyrisLegal'e Sor" bileşenine benzer bir mantıkla çalışıyor, ancak arka planda API'ye `chat_mode: 'intern'` parametresini gönderiyor.
  - Duruşma sırasındaki aciliyete ve odaklanmaya uygun olacak şekilde, gereksiz belge seçicileri veya ataç ikonları bu ekranda kaldırıldı; tamamen **hızlı soru sormaya odaklı sade bir arayüz** sunuldu.
  - Geçmiş mesajlar otomatik olarak Supabase üzerinde (chat_mode = 'intern' filtresiyle) ayrı bir bağlamda saklanıyor, böylece genel sohbetle stajyer aramaları birbirine karışmıyor.

### 3. Kullanıcı Arayüzü (UI) ve İkon Eklentisi
- Uygulamadaki ikon setine (`Icon` objesine) özel `zap` şimşek ikonu eklendi.
- Tip (TypeScript) tanımlamaları güncellenerek sayfanın ve menünün güvenli bir şekilde derlenmesi sağlandı (`npm run build / npx tsc` testleri hatasız geçti).

## Nasıl Test Edilir?
1. Herhangi bir dava dosyasına girin.
2. Sol menüden **"Dijital Stajyer"** sekmesine tıklayın.
3. Mesaj kutusuna doğrudan spesifik bir soru yazın (Örneğin: *"Müştekinin hastane raporu hangi tarihteydi?"* veya *"Sanık ifadesinde saati kaç demişti?"*).
4. Yapay zekanın "merhaba, inceleyelim" gibi girişler yapmadan, doğrudan *"12 Ekim 2021, Belge no: 45"* şeklinde nokta atışı bir cevap verdiğini göreceksiniz.
