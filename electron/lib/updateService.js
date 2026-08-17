// Otomatik güncelleme servisi (bkz. PRD "Electron Auto Update System"). Lisans
// sistemine (licenseService.js) HİÇ dokunmuyor — App Start → License Valid →
// Update Check sırası, renderer tarafında LicenseGate'in içine yerleştirilen
// UpdateGate ile sağlanıyor (bkz. src/components/UpdateGate.tsx); bu dosya
// sadece IPC üzerinden çağrılan mekanik kısmı yapıyor.
//
// "Sıfırdan custom updater yazma" talimatına uyarak asıl indirme/doğrulama/kurulum
// işini electron-updater'a bırakıyoruz (generic provider, electron-builder'ın
// otomatik ürettiği app-update.yml + latest.yml üzerinden — bkz. package.json
// "build.publish"). Kendi yazdığımız tek kısım: hangi sürümün "mandatory"
// sayılacağına karar veren küçük semver karşılaştırıcı ve özel metadata isteği
// (mandatory/release_notes/minimum_version — bunlar latest.yml'de yok).
const { app } = require('electron');
const { autoUpdater } = require('electron-updater');

// Lisans sistemiyle aynı self-hosted Supabase/Kong projesi — ayrı bir proje
// verilmediği sürece bu varsayım geçerli, farklıysa güncellenmesi gerekir.
const UPDATE_API_URL = 'https://supa.ayris.tech/functions/v1/app-update';
const REQUEST_TIMEOUT_MS = 15000;

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

let mainWindowGetter = () => null;
let lastMetadata = null;

function log(...args) {
  console.log('[UPDATE]', ...args);
}

function sendToRenderer(channel, payload) {
  const win = mainWindowGetter();
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

// "1.10.0" > "1.9.0" gibi karşılaştırmalar string olarak yanlış sonuç verir —
// PRD §25 semver kullanımını açıkça istiyor. Parça parça sayısal karşılaştırma
// yeterli (bu proje basit X.Y.Z sürümleme kullanıyor, pre-release/build
// metadata desteklemiyoruz).
function compareVersions(a, b) {
  const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function fetchUpdateMetadata() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const currentVersion = app.getVersion();
  const startedAt = Date.now();
  try {
    const params = new URLSearchParams({
      platform: process.platform,
      arch: process.arch,
      current_version: currentVersion,
    });
    const res = await fetch(`${UPDATE_API_URL}?${params.toString()}`, { signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { checked: false };
    }
    // minimum_version'ın altında kalan bir sürüm, backend "mandatory" demese
    // bile zorunlu güncelleme sayılır (PRD §18).
    const belowMinimum = data.minimum_version ? compareVersions(currentVersion, data.minimum_version) < 0 : false;
    return {
      checked: true,
      updateAvailable: !!data.update_available,
      version: data.version || null,
      mandatory: !!data.update_available && (!!data.mandatory || belowMinimum),
      releaseNotes: Array.isArray(data.release_notes) ? data.release_notes : [],
      publishedAt: data.published_at || null,
    };
  } catch (e) {
    // Gerçek sebep (timeout/AbortError, DNS/ENOTFOUND, sertifika, vb.) daha
    // önce burada hiç loglanmıyordu — "sunucuya ulaşılamadı" mesajı gerçek
    // teşhisi imkansız kılıyordu.
    log(`Ağ hatası (ham, ${Date.now() - startedAt}ms sonra):`, e && e.name, e && e.message, e && e.cause ? e.cause : '');
    return { checked: false, networkError: true };
  } finally {
    clearTimeout(timeoutId);
  }
}

let listenersAttached = false;

function initAutoUpdater(getMainWindow) {
  mainWindowGetter = getMainWindow;
  // createWindow() macOS'ta 'activate' ile (tüm pencereler kapandıktan sonra)
  // tekrar çağrılabiliyor — autoUpdater tekil (module-level) olduğu için
  // dinleyicileri sadece bir kere bağlıyoruz, yoksa her olay birden çok kez tetiklenir.
  if (listenersAttached) return;
  listenersAttached = true;

  autoUpdater.on('error', (err) => {
    log('Hata:', err && err.message ? err.message : err);
    sendToRenderer('update-error', { message: (err && err.message) || 'Güncelleme sırasında hata oluştu.' });
  });

  autoUpdater.on('download-progress', (progress) => {
    log(`İndirme ilerlemesi: %${Math.round(progress.percent)}`);
    sendToRenderer('update-download-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', () => {
    log('İndirme tamamlandı.');
    sendToRenderer('update-downloaded', {});
  });
}

// PRD §26: development modunda production update sistemi çalışmamalı.
async function checkForUpdates() {
  if (!app.isPackaged) {
    log('Development modunda güncelleme kontrolü atlandı.');
    return { checked: false, dev: true };
  }
  log(`Mevcut sürüm: ${app.getVersion()}`);
  log('Güncelleme kontrol ediliyor');
  const metadata = await fetchUpdateMetadata();
  lastMetadata = metadata;
  if (metadata.updateAvailable) {
    log(`Güncelleme mevcut: ${metadata.version}${metadata.mandatory ? ' (zorunlu)' : ''}`);
  } else if (metadata.checked) {
    log('Güncelleme yok.');
  } else {
    log('Güncelleme kontrolü başarısız (sunucuya ulaşılamadı).');
  }
  return metadata;
}

// Asıl indirme electron-updater'a bırakılıyor — checkForUpdates() burada
// electron-updater'ın KENDİ (latest.yml tabanlı) kontrolü, downloadUpdate()
// öncesi zorunlu bir adım.
async function downloadUpdate() {
  if (!app.isPackaged) return { started: false };
  try {
    log('İndirme başladı');
    await autoUpdater.checkForUpdates();
    await autoUpdater.downloadUpdate();
    return { started: true };
  } catch (e) {
    log('İndirme başarısız:', e.message);
    sendToRenderer('update-error', { message: 'Son güncelleme indirilemedi.' });
    return { started: false, error: e.message };
  }
}

function installUpdate() {
  log('Kuruluyor, uygulama yeniden başlatılacak.');
  autoUpdater.quitAndInstall();
}

function getCurrentVersion() {
  return app.getVersion();
}

function getUpdateStatus() {
  return lastMetadata;
}

module.exports = { initAutoUpdater, checkForUpdates, downloadUpdate, installUpdate, getCurrentVersion, getUpdateStatus };
