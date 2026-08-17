// Google Drive Backup kuyruğu (PRD "AyrisLegal Google Drive Backup & Recovery",
// Faz 2). importQueue.js ile bilerek aynı desen: durum bir JSON dosyasında
// tutulur, concurrency kontrollü worker havuzu, backoff'lu retry. Fark: hedef
// register-local değil backend'in /api/google-drive/upload'ı — Google Drive
// çağrısını backend yapıyor, Electron hiçbir zaman Google credential'ı görmüyor,
// sadece dosya baytlarını backend'e taşıyor.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const { getDosyalarRoot } = require('./fileStore');

const CONCURRENCY = 2;
const SCAN_INTERVAL_MS = 5 * 60 * 1000; // PRD §30: "belirli aralıklarla"
// PRD §17'deki backoff cetveli birebir: 5sn, 15sn, 30sn, 60sn.
const RETRY_DELAYS_MS = [5000, 15000, 30000, 60000];
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;

let manifest = {};
let manifestLoaded = false;
let _getAuthToken = () => null;
let _backendUrl = '';
let processing = false;
let rerunRequested = false;
const activeControllers = new Map(); // relativePath -> AbortController (iptal için)
const retryTimers = new Map(); // relativePath -> Timeout
const progressListeners = [];

function getManifestPath() {
  return path.join(app.getPath('userData'), 'dosyalar', '.backup-state.json');
}
function getSettingsPath() {
  return path.join(app.getPath('userData'), 'backup-settings.json');
}

function loadManifest() {
  try {
    manifest = JSON.parse(fs.readFileSync(getManifestPath(), 'utf8'));
  } catch {
    manifest = {};
  }
  manifestLoaded = true;
}

function saveManifest() {
  try {
    fs.mkdirSync(path.dirname(getManifestPath()), { recursive: true });
    fs.writeFileSync(getManifestPath(), JSON.stringify(manifest, null, 2));
  } catch (e) {
    console.error('[BACKUP] Durum dosyası yazılamadı:', e.message);
  }
}

function loadSettings() {
  try {
    return { autoBackupEnabled: true, ...JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8')) };
  } catch {
    return { autoBackupEnabled: true };
  }
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error('[BACKUP] Ayarlar yazılamadı:', e.message);
  }
}

function notifyProgress() {
  const status = getStatus();
  progressListeners.forEach((fn) => {
    try { fn(status); } catch { /* dinleyici hatası kuyruğu etkilemesin */ }
  });
}

function onProgress(fn) {
  progressListeners.push(fn);
}

function init({ getAuthToken, backendUrl }) {
  _getAuthToken = getAuthToken || _getAuthToken;
  _backendUrl = backendUrl || _backendUrl;
  loadManifest();
  setInterval(() => {
    const settings = loadSettings();
    if (!settings.autoBackupEnabled) return;
    scanAndQueue();
    processAll().catch((e) => console.error('[BACKUP] Periyodik tur hatası:', e.message));
  }, SCAN_INTERVAL_MS);
}

function sha256OfFile(absolutePath) {
  const buffer = fs.readFileSync(absolutePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Tüm local dosyaları tarar. PRD §13: her açılışta her şeyi tekrar yüklememek
// için önce ucuz metadata (boyut + değiştirilme zamanı) kontrol edilir; SHA-256
// SADECE metadata değiştiğinde hesaplanır (büyük dosyalarda gereksiz maliyet
// olmasın diye).
function scanAndQueue() {
  if (!manifestLoaded) loadManifest();
  const root = getDosyalarRoot();
  let queued = 0;

  function walk(dir, caseTitle) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      // Symlink'ler ASLA takip edilmiyor (PRD §13/§30) — "case-folder/evrak.pdf"
      // görünümündeki bir dosya aslında sistemin başka bir yerine (örn. bir
      // kimlik bilgisi dosyasına) işaret eden bir symlink olabilir; fs.statSync/
      // readFileSync varsayılan olarak symlink'i takip eder, bu da o dosyayı
      // sessizce kullanıcının Google Drive'ına yükler. Dizin de olsa dosya da
      // olsa symlink'i burada tamamen atlıyoruz.
      if (entry.isSymbolicLink()) {
        console.error(`[BACKUP] Symlink atlandı (güvenlik): ${abs}`);
        continue;
      }
      if (entry.isDirectory()) {
        walk(abs, caseTitle || entry.name);
        continue;
      }
      if (entry.name.startsWith('.')) continue; // .import-state.json, .backup-state.json vb.

      const relativePath = path.relative(root, abs);
      let stat;
      try {
        stat = fs.statSync(abs);
      } catch {
        continue;
      }

      const existing = manifest[relativePath];
      const metadataUnchanged = existing && existing.size === stat.size && existing.modifiedAt === stat.mtimeMs && existing.status === 'synced';
      if (metadataUnchanged) continue;

      let sha256;
      try {
        sha256 = sha256OfFile(abs);
      } catch (e) {
        console.error(`[BACKUP] Hash hesaplanamadı (${relativePath}):`, e.message);
        continue;
      }

      if (existing && existing.sha256 === sha256 && existing.status === 'synced') {
        // İçerik aynı, sadece mtime değişmiş (dosyaya dokunulmuş olabilir) —
        // tekrar yüklemeye gerek yok, sadece bookkeeping güncelleniyor.
        existing.size = stat.size;
        existing.modifiedAt = stat.mtimeMs;
        manifest[relativePath] = existing;
        continue;
      }

      manifest[relativePath] = {
        caseTitle: caseTitle || 'dosyasiz',
        fileName: entry.name,
        absolutePath: abs,
        size: stat.size,
        modifiedAt: stat.mtimeMs,
        sha256,
        driveFileId: existing?.driveFileId || null,
        status: 'pending',
        attempts: 0,
        lastError: null,
        updatedAt: Date.now(),
      };
      queued++;
    }
  }

  walk(root, null);
  if (queued > 0) {
    saveManifest();
    console.log(`[BACKUP] Tarama tamamlandı: ${queued} dosya kuyruğa alındı.`);
  }
  return queued;
}

function scheduleRetry(relPath, attemptNumber) {
  const delay = RETRY_DELAYS_MS[attemptNumber - 1] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
  clearTimeout(retryTimers.get(relPath));
  const timer = setTimeout(() => {
    retryTimers.delete(relPath);
    processAll().catch((e) => console.error('[BACKUP] Retry turu hatası:', e.message));
  }, delay);
  retryTimers.set(relPath, timer);
}

async function processOne(relPath, entry) {
  const token = _getAuthToken();
  if (!token) return; // oturum yok — deneme hakkı harcamadan atla

  entry.status = 'uploading';
  entry.updatedAt = Date.now();
  manifest[relPath] = entry;
  saveManifest();
  notifyProgress();

  const ctrl = new AbortController();
  activeControllers.set(relPath, ctrl);
  try {
    const buffer = fs.readFileSync(entry.absolutePath);
    const formData = new FormData();
    formData.append('file', new Blob([buffer]), entry.fileName);
    formData.append('case_title', entry.caseTitle);
    formData.append('local_path', relPath);
    formData.append('local_modified_at', new Date(entry.modifiedAt).toISOString());
    formData.append('sha256', entry.sha256);

    console.log(`[BACKUP] Upload started: ${relPath}`);
    const res = await fetch(`${_backendUrl}/google-drive/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    entry.status = 'synced';
    entry.driveFileId = data.drive_file_id || entry.driveFileId;
    entry.attempts = 0;
    entry.lastError = null;
    console.log(`[BACKUP] Upload completed: ${relPath}`);
  } catch (e) {
    if (e.name === 'AbortError') {
      // Kullanıcı iptal etti (PRD §33) — deneme hakkı harcanmadan pending'e döner.
      entry.status = 'pending';
      console.log(`[BACKUP] Upload cancelled: ${relPath}`);
    } else {
      entry.attempts += 1;
      entry.lastError = e.message || String(e);
      console.error(`[BACKUP] Upload failed (${relPath}):`, entry.lastError);
      if (entry.attempts < MAX_ATTEMPTS) {
        entry.status = 'pending';
        scheduleRetry(relPath, entry.attempts);
      } else {
        entry.status = 'failed';
      }
    }
  } finally {
    activeControllers.delete(relPath);
    entry.updatedAt = Date.now();
    manifest[relPath] = entry;
    saveManifest();
    notifyProgress();
  }
}

// importQueue.js'deki processAll() ile aynı "zaten çalışıyorsa bir tur daha
// talep et" deseni — periyodik tarama, manuel "Şimdi Yedekle" ve retry
// zamanlayıcıları aynı anda tetiklenirse üst üste binmesinler diye.
async function processAll() {
  if (processing) {
    rerunRequested = true;
    return;
  }
  processing = true;
  try {
    do {
      rerunRequested = false;
      if (!_getAuthToken()) break;
      if (!manifestLoaded) loadManifest();
      const todo = Object.entries(manifest).filter(([, v]) => v.status === 'pending');
      if (todo.length === 0) break;
      let idx = 0;
      async function worker() {
        while (idx < todo.length) {
          const [relPath, entry] = todo[idx++];
          await processOne(relPath, entry);
        }
      }
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
    } while (rerunRequested);
  } finally {
    processing = false;
  }
}

// Ayarlar ekranındaki "Şimdi Yedekle" — otomatik yedekleme kapalı olsa bile çalışır.
function triggerNow() {
  scanAndQueue();
  return processAll();
}

function cancelUpload(relativePath) {
  const ctrl = activeControllers.get(relativePath);
  if (ctrl) {
    ctrl.abort();
    return true;
  }
  return false;
}

function retryFailed(relativePath) {
  if (!manifestLoaded) loadManifest();
  const entry = manifest[relativePath];
  if (!entry) return false;
  entry.status = 'pending';
  entry.attempts = 0;
  entry.lastError = null;
  entry.updatedAt = Date.now();
  manifest[relativePath] = entry;
  saveManifest();
  processAll().catch((e) => console.error('[BACKUP] Yeniden deneme hatası:', e.message));
  return true;
}

function getStatus() {
  if (!manifestLoaded) loadManifest();
  const entries = Object.values(manifest);
  const counts = { pending: 0, uploading: 0, synced: 0, failed: 0, deleted_local: 0, conflict: 0 };
  let totalSyncedSize = 0;
  for (const e of entries) {
    counts[e.status] = (counts[e.status] || 0) + 1;
    if (e.status === 'synced') totalSyncedSize += e.size || 0;
  }
  return { counts, totalFiles: entries.length, totalSyncedSize, autoBackupEnabled: loadSettings().autoBackupEnabled };
}

function getEntriesForCase(caseTitle) {
  if (!manifestLoaded) loadManifest();
  const needle = String(caseTitle || '').toLowerCase();
  return Object.entries(manifest)
    .filter(([, e]) => String(e.caseTitle || '').toLowerCase() === needle)
    .map(([relativePath, e]) => ({ relativePath, fileName: e.fileName, status: e.status, attempts: e.attempts, lastError: e.lastError, updatedAt: e.updatedAt }));
}

function setAutoBackupEnabled(enabled) {
  const settings = loadSettings();
  settings.autoBackupEnabled = !!enabled;
  saveSettings(settings);
}

module.exports = {
  init,
  scanAndQueue,
  processAll,
  triggerNow,
  cancelUpload,
  retryFailed,
  getStatus,
  getEntriesForCase,
  onProgress,
  setAutoBackupEnabled,
};
