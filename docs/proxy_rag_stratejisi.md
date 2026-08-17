# Gerçek Zamanlı (Proxy) RAG Stratejisi

Eğer Laawos, içtihatları kendi veritabanında tutmak yerine **doğrudan Yargıtay sisteminden (Yargı MCP üzerinden) anlık olarak çekiyorsa**, bu durum projenin tüm altyapı stratejisini muazzam bir şekilde değiştirir. 

Bu senaryo, veritabanı maliyetlerini sıfıra indirirken, yapay zeka (RAG) entegrasyonu için çok zekice bir **"Avcı-Toplayıcı (Lazy Caching)"** mimarisini zorunlu kılar.

---

## 1. Sistemin Mevcut Avantajları (Neden Harika Bir Durum?)
- **Sıfır Sunucu Maliyeti:** 12 Milyon kararı depolamak, endekslemek ve RAM'de tutmak (aylık yüzlerce dolarlık sunucu masrafı) tamamen ortadan kalkar.
- **Sıfır Veritabanı Şişmesi:** Veriler Yargıtay'da kalır. Sizin sunucunuz (Laawos Backend) sadece bir "köprü (proxy)" görevi görür.
- **Daima Güncel:** Her arama doğrudan Yargıtay'a gittiği için, dün çıkmış bir karar bile saniyesinde sisteminize yansır. Veritabanı güncelleme derdi yoktur.

---

## 2. Sorun: "O Zaman Yapay Zeka (RAG) Nasıl Çalışacak?"
Eğer veritabanımız yoksa, vektör araması da yapamayız. Çünkü Yargıtay'ın kendi arama motoru sadece **Klasik Kelime Araması** ("göçmen kaçakçılığı beraat") destekler, anlamsal (vektörel) aramayı desteklemez.

**Çözüm: "Süzgeç (JIT RAG) Mimarisi"**
Yapay zekayı, aramayı yapan değil; **arama sonuçlarını okuyan, süzen ve anlamlandıran bir asistan** olarak kullanmalıyız.

### Adım Adım İşleyiş:
1. **Avukat Arama Yapar:** Avukat "Göçmen kaçakçılığında şoförün beraati" yazar.
2. **Yargı MCP (Klasik Arama):** Sistem bu kelimeleri doğrudan Yargıtay'a iletir. Yargıtay'dan (tamamen kelime eşleşmesiyle) 20 tane ham karar listesi gelir.
3. **Yapay Zeka Devreye Girer (Anlık Analiz):** Gelen bu 20 kararın tam metni arka planda milisaniyeler içinde Yapay Zekaya (LLM'e) gönderilir. 
4. **Filtreleme ve Raporlama:** Yapay zekaya şu talimat verilir: 
   > *"Kullanıcı şoförün beraat ettiği davaları arıyor. Yargıtay'dan gelen bu 20 kararı hızlıca tara. Gerçekten şoförün beraat ettiği 3 kararı seç ve bunların o kısımlarını alıntılayarak kullanıcıya göster. Alakasız olan 17 tanesini gizle."*
5. **Sonuç:** Kullanıcı ekranda sadece nokta atışı 3 kararı ve yapay zekanın "Bu karar tam sizin aradığınız şoför beraatiyle ilgili, çünkü gerekçenin şu paragrafında geçiyor..." notunu görür.

---

## 3. Uzun Vadeli "Kendi Kendini İnşa Eden Veritabanı" (Tembel Ön Bellekleme)
Kullanıcılar Yargıtay'dan kararları çektikçe ve okudukça, sistemi bedavaya eğitebiliriz:
- Avukatın tıklayıp okuduğu, değer bulduğu kararlar (anlık olarak Yargıtay'dan çekilmiş olsa da) sessizce **Laawos'un kendi veritabanına** kaydedilir (Vektörleri çıkarılarak).
- Bu sayede 12 milyonluk çöp yığını sizin sisteminize girmez.
- 1 yılın sonunda, sadece avukatların işine yaramış, en kritik ve değerli 100.000 karar sizin veritabanınızda "Premium Vektör Havuzu" olarak birikmiş olur.
- Gelecekte bir avukat arama yaptığında sistem önce sizin **Premium Havuzunuza** (çok hızlı ve yapay zeka destekli) bakar. Bulamazsa Yargıtay'a (klasik aramaya) gider.

Buna yazılım mimarisinde **Cache-Aside Pattern (Okuma Ön Belleği)** denir ve Laawos gibi proxy tabanlı sistemler için kurilebilecek en kusursuz stratejidir.
