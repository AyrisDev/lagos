# Ayris Legal — Mac App Store & Microsoft Store Yayınlama Kılavuzu

Bu doküman, **Ayris Legal** masaüstü uygulamasının **Apple Mac App Store** ve **Microsoft Store (Windows)** mağazalarına derlenmesi, paketlenmesi, imzalanması ve yayına gönderilmesi süreçlerinin eksiksiz rehberidir.

---

## BÖLÜM 1: Apple Mac App Store (MAS) Yayın Süreci

### 1. Gereksinimler & Sertifikalar
Mac App Store'a yükleme yapabilmek için Mac'inizdeki Keychain'de şu iki sertifikanın bulunması zorunludur:
1. **Apple Distribution:** (veya *3rd Party Mac Developer Application: Mustafa YILDIZ (955Q2CT9X5)*) — Uygulama paketini (`.app`) imzalar.
2. **3rd Party Mac Developer Installer:** (Mustafa YILDIZ (955Q2CT9X5)) — Yükleyici paketini (`.pkg`) imzalar.
3. **Provisioning Profile:** Apple Developer Portal'dan indirilen ve `build/embedded.provisionprofile` konumuna yerleştirilen resmi Mac App Store Sağlama Profili.

### 2. Proje Yapılandırması
* **Bundle ID (`appId`):** `com.ayrisdev.ayrislegal`
* **Sandbox Yetki Dosyası:** `build/entitlements.mas.plist`
  * `com.apple.security.app-sandbox`: `true`
  * `com.apple.application-identifier`: `955Q2CT9X5.com.ayrisdev.ayrislegal`
  * `com.apple.developer.team-identifier`: `955Q2CT9X5`
  * Kullanıcı dosya erişimi, ağ erişimi ve V8 JIT izinleri tanımlıdır.
* **Child Process Yetki Dosyası:** `build/entitlements.mas.inherit.plist`

### 3. Derleme Komutu
Terminalden şu komut çalıştırılır:
```bash
npm run build:mas
```
Bu komut Next.js uygulamasını optimize eder, Electron Sandbox mimarisinde imzalar ve şu çıktıyı üretir:
* 📁 **`dist/mas-arm64/AyrisLegal-0.1.10-arm64.pkg`**

### 4. Transporter & App Store Connect Yüklemesi
1. Mac'inizde **Transporter** uygulamasını açın.
2. `dist/mas-arm64/AyrisLegal-0.1.10-arm64.pkg` dosyasını Transporter penceresine sürükleyip bırakın ve **Teslim Et (Deliver)** butonuna basın.
3. [appstoreconnect.apple.com](https://appstoreconnect.apple.com/) adresine gidin.
4. **macOS App** sürümünüzü açın ve yüklenen derlemeyi (Build) seçin.
5. **App Encryption Documentation (Şifreleme Beyanı):**
   * Soru: *"What type of encryption algorithms does your app implement?"*
   * Seçilecek Cevap: 🔘 **`None of the algorithms mentioned above`** *(Standart HTTPS/SSL kullanımı için muafiyet sağlar, ek belge istemez)*.
6. Ekran görüntüleri, açıklama ve fiyatı kaydedip **Add for Review (İncelemeye Gönder)** butonuna tıklayın.

---

## BÖLÜM 2: Microsoft Store (Windows Store) Yayın Süreci

### 1. Neden `.appx` (MSIX) Formatı?
Microsoft Store kuralı (Policy 10.2.9) gereği doğrudan `.exe` yüklendiğinde pahalı EV Code Signing sertifikası istenir. Ancak **`.appx`** paketi yüklendiğinde **Microsoft resmi kod imzalamayı ve barındırmayı ÜCRETSİZ olarak kendisi yapar**.

### 2. Partner Center Paket Kimliği (Product Identity)
[`package.json`](file:///Users/mstfyldz/Github/laawos/package.json) dosyasında tanımlı Microsoft Store kimlikleri:
```json
"appx": {
  "applicationId": "AyrisLegal",
  "identityName": "38265Suppetiae.AyrisLegal",
  "publisher": "CN=2C932EFD-CD8E-4BEA-AD12-F3D87DD6C652",
  "publisherDisplayName": "Suppetiae",
  "displayName": "Ayris Legal"
}
```

### 3. GitHub Actions ile Otomatik Windows Build Alma
Windows Store derlemesi `.github/workflows/build-windows-store.yml` iş akışı üzerinden GitHub'ın resmi Windows 11 sanal makinelerinde üretilir:
1. Değişiklikleri push edin:
   ```bash
   git push origin main
   ```
2. GitHub reponuzda [github.com/AyrisDev/lagos/actions](https://github.com/AyrisDev/lagos/actions) sekmesine gidin.
3. **"Build Windows Store AppX"** iş akışını seçip sağdaki **"Run workflow"** butonuna basın.
4. 2-3 dakika sonra iş akışı bittiğinde sayfanın altındaki **Artifacts** kısmından **`AyrisLegal-Windows-Store-AppX`** paketini (`.zip`) indirin.

### 4. Partner Center Gönderimi
1. İndirdiğiniz zip içindeki **`Ayris Legal 0.1.10.appx`** dosyasını Microsoft Partner Center'daki **Packages** adımına yükleyin.
2. **`runFullTrust` Uyarısı İçin Açıklama Notu:**
   ```text
   Ayris Legal is a professional legal desktop application built with Electron. The runFullTrust capability is required for reading and processing local legal case documents (PDF, UDF, DOCX), local file storage, and desktop notifications.
   ```
3. **Store Listing (Mağaza Listeleme) Bilgileri:**
   * **Ürün Adı:** `Ayris Legal`
   * **Kısa Açıklama:** `Avukatlar ve hukuk büroları için yapay zeka destekli dava analizi, otomatik dilekçe oluşturma, emsal içtihat arama ve duruşma takip platformu.`
   * **Geliştirici:** `Ayris Tech`
   * **Telif Hakkı:** `© 2026 Ayris Tech. Tüm hakları saklıdır.`
   * **Arama Terimleri:** `hukuk programı`, `avukat yazılımı`, `dava takibi`, `dilekçe hazırlama`, `içtihat arama`, `yapay zeka hukuk`, `uyap dava yönetimi`.
   * **Lisans Şartları (EULA):** Standart Ayris Legal EULA metni.
4. **Age ratings (Yaş Sınırlaması)** ve **Pricing (Fiyat)** adımlarını tamamlayıp **Submit to the Store** butonuna basarak onaya gönderin.

---

## BÖLÜM 3: Gelecek Güncellemelerde İzlenecek Hızlı Kontrol Listesi

1. `package.json` dosyasındaki `"version"` alanını artırın (Örn: `0.1.11`).
2. **Mac İçin:** `npm run build:mas` çalıştırın -> Çıkan `.pkg` dosyasını Transporter ile gönderin.
3. **Windows İçin:** Kodu GitHub'a push edin -> GitHub Actions'tan `build:appx` çalıştırın -> İnen `.appx` dosyasını Partner Center'a yükleyin.
