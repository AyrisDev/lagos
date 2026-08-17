// Online lisans doğrulama servisi (bkz. PRD "Electron License System"). Renderer
// buraya DOĞRUDAN erişemez — sadece IPC üzerinden (main.js'teki 'license:*'
// handler'ları) çağrılır, backend isteği hep bu (main) süreçte yapılır.
//
// license_key + device_id, Electron'un işletim sistemine yerleşik güvenli
// depolama mekanizmasını (macOS Keychain / Windows DPAPI / Linux Secret Service)
// kullanan safeStorage ile şifrelenip tek bir dosyada saklanıyor — ek bir
// bağımlılık (örn. keytar) gerekmiyor.
const { app, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const LICENSE_API_URL = 'https://supa.ayris.tech/functions/v1/license';
const REQUEST_TIMEOUT_MS = 15000;

const ERROR_MESSAGES = {
  INVALID_LICENSE: 'Geçersiz lisans anahtarı.',
  LICENSE_REVOKED: 'Bu lisans devre dışı bırakılmış.',
  LICENSE_EXPIRED: 'Lisansınızın süresi dolmuş.',
  DEVICE_NOT_ACTIVATED: 'Bu cihaz aktive edilmemiş.',
  DEVICE_LIMIT_REACHED: 'Bu lisans için maksimum cihaz sayısına ulaşıldı.',
  SERVER_CONFIGURATION_ERROR: 'Sunucu yapılandırma hatası. Lütfen destek ile iletişime geçin.',
  INTERNAL_SERVER_ERROR: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
};

function errorMessageFor(code, fallback) {
  return ERROR_MESSAGES[code] || fallback || 'Lisans doğrulanamadı.';
}

function getStatePath() {
  return path.join(app.getPath('userData'), 'license-state.dat');
}

function readState() {
  try {
    const encrypted = fs.readFileSync(getStatePath());
    if (!safeStorage.isEncryptionAvailable()) return null;
    return JSON.parse(safeStorage.decryptString(encrypted));
  } catch {
    return null;
  }
}

function writeState(state) {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.error('[license] safeStorage şifreleme bu sistemde kullanılamıyor, durum kaydedilemedi.');
      return false;
    }
    fs.mkdirSync(path.dirname(getStatePath()), { recursive: true });
    fs.writeFileSync(getStatePath(), safeStorage.encryptString(JSON.stringify(state)));
    return true;
  } catch (e) {
    console.error('[license] Durum yazılamadı:', e.message);
    return false;
  }
}

// Bilgisayar başına kalıcı, rastgele bir kimlik — bir kere üretilip şifreli
// durum dosyasında saklanır. license_key temizlense (clearLicense) bile
// device_id aynı kalır ki backend "aynı cihaz" olarak tanımaya devam etsin.
function getDeviceId() {
  const state = readState();
  if (state?.device_id) return state.device_id;
  const deviceId = crypto.randomUUID();
  writeState({ ...(state || {}), device_id: deviceId });
  return deviceId;
}

function saveLicenseKey(licenseKey, email) {
  const state = readState() || {};
  return writeState({ ...state, license_key: licenseKey, email: email, device_id: state.device_id || getDeviceId() });
}

function readStoredLicenseKey() {
  return readState()?.license_key || null;
}

function hasStoredLicense() {
  return !!readStoredLicenseKey();
}

function clearLicense() {
  const state = readState();
  if (state) writeState({ device_id: state.device_id }); // device_id korunur, sadece anahtar silinir
}

async function callLicenseApi(body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(LICENSE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (e) {
    // Zaman aşımı, DNS/bağlantı hatası vb. — hepsi kullanıcıya aynı "internet
    // gerekli" mesajıyla gösteriliyor, teknik ayrım yapmanın kullanıcıya faydası yok.
    // Ama teşhis için ham hatayı konsola yazıyoruz (kullanıcıya değil).
    console.error('[license] Ağ hatası (ham):', e && e.name, e && e.message, e && e.cause ? e.cause : '');
    return { ok: false, data: {}, networkError: true };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function activateLicense(licenseKey, email) {
  const trimmed = String(licenseKey || '').trim();
  if (!trimmed) return { valid: false, message: 'Lisans anahtarı boş olamaz.' };

  const result = await callLicenseApi({
    action: 'activate',
    license_key: trimmed,
    device_id: getDeviceId(),
    device_name: os.hostname(),
    platform: process.platform,
    app_version: app.getVersion(),
  });

  if (result.networkError) {
    return { valid: false, networkError: true, message: 'İnternet bağlantısı gerekli. Lisansınız doğrulanamadı.' };
  }
  if (!result.ok || !result.data?.success || !result.data?.valid) {
    return { valid: false, message: errorMessageFor(result.data?.error || result.data?.code, result.data?.message) };
  }
  saveLicenseKey(trimmed, email);
  return { valid: true, license: result.data.license, device: result.data.device };
}

async function validateLicense(currentEmail) {
  const state = readState();
  const licenseKey = state?.license_key;
  if (!licenseKey) {
    return { valid: false, needsActivation: true };
  }

  // E-posta eşleşme kontrolü: Cihazdaki lisansın kaydedildiği mail ile şu an giriş yapılan mail farklıysa hata ver.
  if (state.email && currentEmail && state.email !== currentEmail) {
    return { 
      valid: false, 
      message: 'Bu lisans anahtarı cihazda farklı bir e-posta adresine (' + state.email + ') kayıtlı. Lütfen kendi lisansınızı girin veya doğru hesapla giriş yapın.' 
    };
  }

  const result = await callLicenseApi({
    action: 'validate',
    license_key: licenseKey,
    device_id: getDeviceId(),
    app_version: app.getVersion(),
  });

  if (result.networkError) {
    return { valid: false, networkError: true, message: 'İnternet bağlantısı gerekli. Lisansınız doğrulanamadı.' };
  }
  if (!result.ok || !result.data?.success || !result.data?.valid) {
    // Geçersiz/süresi dolmuş/iptal edilmiş bir anahtarı saklamaya devam etmenin
    // anlamı yok — kullanıcı yeni bir anahtar girebilsin diye temizleniyor.
    clearLicense();
    return { valid: false, message: errorMessageFor(result.data?.error || result.data?.code, result.data?.message) };
  }
  return { valid: true, license: result.data.license };
}

module.exports = { getDeviceId, activateLicense, validateLicense, clearLicense, hasStoredLicense };
