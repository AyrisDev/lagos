// Google Drive Restore (PRD "AyrisLegal Google Drive Backup & Recovery", Faz 3).
// Uygulamanın diğer bağlantı/case/analiz verisi zaten Supabase'de (bulutta)
// yaşıyor — bir bilgisayar arızasında asıl kaybolan şey yalnızca HAM dosyalar
// (PDF/TIFF vb.), o yüzden restore sadece bunları Drive'dan yerel "dosyalar"
// klasörüne geri indiriyor; documents/cases kayıtlarına dokunmuyor (zaten
// bozulmadılar).
//
// Bilinçli olarak SIRALI (concurrency yok): restore nadir/tek seferlik bir
// işlem (yeni bilgisayar kurulumu gibi), backupQueue'daki gibi sürekli çalışan
// bir kuyruk değil — basitlik burada throughput'tan daha değerli.
const fs = require('fs');
const path = require('path');
const { getDosyalarRoot, resolveSafeLocalPath } = require('./fileStore');

let _getAuthToken = () => null;
let _backendUrl = '';
let restoring = false;
const progressListeners = [];

function init({ getAuthToken, backendUrl }) {
  _getAuthToken = getAuthToken || _getAuthToken;
  _backendUrl = backendUrl || _backendUrl;
}

function notify(status) {
  progressListeners.forEach((fn) => {
    try { fn(status); } catch { /* dinleyici hatası restore'u etkilemesin */ }
  });
}

function onProgress(fn) {
  progressListeners.push(fn);
}

// Ayarlar ekranındaki "Google Drive'dan Geri Yükle" — önce sadece listeyi
// çekip kaç dosya bulunduğunu gösterir (PRD §28 "1.284 dosya bulundu"),
// gerçek indirme startRestore() ile ayrı bir adımda (kullanıcı onayından sonra).
async function listBackupFiles() {
  const token = _getAuthToken();
  if (!token) return { files: [], error: 'Oturum bulunamadı.' };
  try {
    const res = await fetch(`${_backendUrl}/google-drive/backup-files`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { files: [], error: data.error || 'Liste alınamadı.' };
    return { files: data.files || [] };
  } catch (e) {
    return { files: [], error: e.message || 'Liste alınamadı.' };
  }
}

// Yerelde EKSİK olan dosyaları Drive'dan indirir. Var olan bir dosyanın
// üzerine YAZMAZ — local'de olası daha yeni/farklı bir hali ezmemek için
// (PRD §26'daki "backup local'i otomatik değiştirmemeli" ilkesiyle tutarlı).
async function startRestore() {
  if (restoring) return { started: false, error: 'Zaten devam ediyor.' };
  const token = _getAuthToken();
  if (!token) return { started: false, error: 'Oturum bulunamadı.' };

  restoring = true;
  const root = getDosyalarRoot();
  try {
    const { files, error } = await listBackupFiles();
    if (error) {
      notify({ phase: 'error', message: error });
      return { started: false, error };
    }

    // resolveSafeLocalPath, backend'den (dolayısıyla veritabanından) gelen
    // local_path'in yerel "dosyalar" kökünün DIŞINA çıkmadığını doğruluyor —
    // path traversal'a karşı son savunma katmanı (bkz. fileStore.js).
    const missing = files.filter((f) => {
      const abs = resolveSafeLocalPath(root, f.local_path);
      return abs && !fs.existsSync(abs);
    });
    console.log(`[RESTORE] ${files.length} dosya bulundu, ${missing.length} tanesi yerelde eksik.`);
    notify({ phase: 'running', total: missing.length, restored: 0, failed: 0 });

    let restored = 0;
    let failed = 0;
    for (const file of missing) {
      try {
        const abs = resolveSafeLocalPath(root, file.local_path);
        if (!abs) throw new Error('Güvensiz dosya yolu reddedildi.');

        const res = await fetch(`${_backendUrl}/google-drive/download?drive_file_id=${encodeURIComponent(file.drive_file_id)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, Buffer.from(arrayBuffer));
        restored++;
        console.log(`[RESTORE] Geri yüklendi: ${file.local_path}`);
      } catch (e) {
        failed++;
        console.error(`[RESTORE] Geri yüklenemedi (${file.local_path}):`, e.message);
      }
      notify({ phase: 'running', total: missing.length, restored, failed });
    }

    notify({ phase: 'done', total: missing.length, restored, failed });
    console.log(`[RESTORE] Tamamlandı: ${restored} geri yüklendi, ${failed} başarısız.`);
    return { started: true, total: missing.length, restored, failed };
  } finally {
    restoring = false;
  }
}

function getStatus() {
  return { restoring };
}

module.exports = { init, listBackupFiles, startRestore, getStatus, onProgress };
