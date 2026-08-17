// Crash Reporting & Error Monitoring (PRD "AyrisLegal Crash Reporting & Error
// Monitoring"). Renderer bu modüle HİÇBİR ZAMAN doğrudan erişmiyor — sadece
// IPC üzerinden (bkz. main.js 'crash:*' handler'ları), gönderim burada
// (main process) yapılıyor. Aynı self-hosted Supabase/Kong projesindeki
// license/update Edge Function'larıyla aynı desen.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { app } = require('electron');
const { getDosyalarRoot } = require('./fileStore');

const CRASH_API_URL = 'https://supa.ayris.tech/functions/v1/crash-report';
const MAX_QUEUE_SIZE = 50;
// PRD §33'teki backoff cetveli birebir.
const RETRY_DELAYS_MS = [5000, 30000, 120000, 600000];
const CRASH_LOOP_WINDOW_MS = 2 * 60 * 1000;
const CRASH_LOOP_THRESHOLD = 3;

let reportingEnabled = true;
let safeModeActive = false;
let retryAttempt = 0;
let flushing = false;
let identity = { getLicenseId: () => null, getDeviceId: () => null, getUserId: () => null };

function getQueuePath() { return path.join(app.getPath('userData'), 'crash-queue.json'); }
function getHistoryPath() { return path.join(app.getPath('userData'), 'crash-history.json'); }
function getSettingsPath() { return path.join(app.getPath('userData'), 'crash-settings.json'); }

function loadJson(filePath, fallback) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; }
}
function saveJson(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data));
  } catch (e) {
    console.error('[CRASH] Dosya yazılamadı:', e.message);
  }
}

// ─── Gizlilik / sanitizasyon (PRD §5, §27-30) ────────────────────────────────
// Sadece TEKNİK bilgi (hata adı/mesajı/stack, sürüm, OS) gönderiliyor; dava
// dosyası içeriği, belge metni, kullanıcı mesajı, token, şifre gibi hiçbir şey
// asla toplanmıyor. Aşağıdaki maskeleme, hata mesajı/stack'te YANLIŞLIKLA
// sızabilecek yol/kimlik bilgisi kalıplarını temizliyor — backend tarafında da
// (defense in depth, client'a güvenilmiyor) AYNI temizlik tekrar uygulanıyor.
function sanitizeText(text) {
  if (typeof text !== 'string' || !text) return '';
  let out = text.slice(0, 8000);
  const home = os.homedir();
  if (home) out = out.split(home).join('<USER_HOME>');
  try {
    const dosyalarRoot = getDosyalarRoot();
    if (dosyalarRoot) out = out.split(dosyalarRoot).join('<CASE_PATH>');
  } catch { /* userData henüz hazır değilse sessizce atla */ }
  out = out.replace(/(authorization|bearer|token|api[_-]?key|password|secret|cookie)\s*[:=]\s*\S+/gi, '$1: [REDACTED]');
  out = out.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
  return out;
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);
}

// ─── Ayarlar (opt-out) ────────────────────────────────────────────────────
function loadSettings() {
  return { enabled: true, ...loadJson(getSettingsPath(), {}) };
}

function init({ getLicenseId, getDeviceId, getUserId } = {}) {
  identity = {
    getLicenseId: getLicenseId || identity.getLicenseId,
    getDeviceId: getDeviceId || identity.getDeviceId,
    getUserId: getUserId || identity.getUserId,
  };
  reportingEnabled = loadSettings().enabled;
  // Önceki oturumdan kalan (gönderilememiş) raporlar varsa hemen bir kere dene.
  flushQueue().catch(() => {});
}

function getReportingEnabled() { return reportingEnabled; }
function setReportingEnabled(enabled) {
  reportingEnabled = !!enabled;
  saveJson(getSettingsPath(), { enabled: reportingEnabled });
  // PRD §16: kapatıldığında yeni report gönderilmez; local kuyruk (varsa)
  // basitlik için temizleniyor — "hiç göndermeyeceğiz" dediğimiz veriyi
  // diskte tutmanın bir anlamı yok.
  if (!reportingEnabled) saveJson(getQueuePath(), []);
}

// ─── Fingerprint + kuyruk + gönderim ──────────────────────────────────────
function computeFingerprint(errorName, message, moduleName) {
  const base = `${errorName || ''}|${(message || '').slice(0, 200)}|${moduleName || ''}|${app.getVersion()}`;
  return crypto.createHash('sha256').update(base).digest('hex').slice(0, 32);
}

function buildReport({ eventType, severity, process: proc, error, module: moduleName }) {
  const errorMessage = sanitizeText(error && error.message);
  const stackTrace = sanitizeText(error && error.stack);
  const errorName = (error && error.name) || 'Error';
  return {
    event_id: crypto.randomUUID(),
    event_type: eventType,
    process: proc,
    severity: severity || 'error',
    app_version: app.getVersion(),
    environment: app.isPackaged ? 'production' : 'development',
    electron_version: process.versions.electron,
    os: process.platform === 'darwin' ? 'macOS' : process.platform === 'win32' ? 'Windows' : process.platform,
    os_version: os.release(),
    architecture: process.arch,
    error: { name: errorName, message: errorMessage, stack: stackTrace },
    module: moduleName || null,
    license_id: safeCall(identity.getLicenseId),
    device_id: safeCall(identity.getDeviceId),
    user_id: safeCall(identity.getUserId),
    fingerprint: computeFingerprint(errorName, errorMessage, moduleName),
  };
}

function safeCall(fn) {
  try { return (fn && fn()) || null; } catch { return null; }
}

function enqueue(reportPayload) {
  const queue = loadJson(getQueuePath(), []);
  queue.push(reportPayload);
  saveJson(getQueuePath(), queue.slice(-MAX_QUEUE_SIZE)); // PRD §32: kuyruk sınırsız büyümez
}

async function sendOne(reportPayload) {
  const res = await fetch(CRASH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportPayload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function flushQueue() {
  if (flushing) return;
  flushing = true;
  try {
    let queue = loadJson(getQueuePath(), []);
    while (queue.length > 0) {
      try {
        await sendOne(queue[0]);
        queue = queue.slice(1);
        saveJson(getQueuePath(), queue);
        retryAttempt = 0;
      } catch {
        break; // ilk hatada dur, scheduleRetry() bir sonraki denemeyi ayarlar
      }
    }
    if (queue.length > 0) scheduleRetry();
  } finally {
    flushing = false;
  }
}

function scheduleRetry() {
  const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)];
  retryAttempt++;
  setTimeout(() => { flushQueue().catch(() => {}); }, delay);
}

// Ana raporlama fonksiyonu — main.js'teki global handler'lar VE renderer'dan
// gelen (IPC ile doğrulanmış) hatalar hep buradan geçiyor. Ağ isteği asla ana
// akışı bloklamıyor (PRD §4/§51): önce diske yazılıyor (kaybolmasın), gönderim
// en fazla 3 saniye bekleniyor, sonrası arka planda retry cetveline bırakılıyor.
async function report({ eventType, severity, process: proc, error, module: moduleName }) {
  if (!reportingEnabled) return;
  const payload = buildReport({ eventType, severity, process: proc, error, module: moduleName });
  enqueue(payload);
  await withTimeout(flushQueue(), 3000);
}

// Renderer'dan IPC ile gelen payload'a KESİNLİKLE güvenilmiyor (Electron
// güvenlik ilkesi — renderer güvenilmez) — sadece izin verilen enum
// değerleri ve string alanlar, uzunluk sınırlarıyla kabul ediliyor.
const ALLOWED_EVENT_TYPES = ['crash', 'uncaught_exception', 'unhandled_rejection', 'renderer_crash', 'ipc_error', 'license_error', 'update_error', 'backup_error', 'oauth_error', 'network_error'];
const ALLOWED_SEVERITIES = ['fatal', 'error', 'warning', 'info'];

function reportFromRenderer(payload) {
  const eventType = ALLOWED_EVENT_TYPES.includes(payload && payload.eventType) ? payload.eventType : 'crash';
  const severity = ALLOWED_SEVERITIES.includes(payload && payload.severity) ? payload.severity : 'error';
  const rawError = (payload && payload.error) || {};
  const error = {
    name: typeof rawError.name === 'string' ? rawError.name.slice(0, 200) : 'Error',
    message: typeof rawError.message === 'string' ? rawError.message.slice(0, 2000) : '',
    stack: typeof rawError.stack === 'string' ? rawError.stack.slice(0, 8000) : '',
  };
  const moduleName = typeof (payload && payload.module) === 'string' ? payload.module.slice(0, 50) : 'ui';
  return report({ eventType, severity, process: 'renderer', error, module: moduleName });
}

// ─── Ana süreç global hata yakalayıcıları (PRD §9-10) ─────────────────────
function initGlobalHandlers() {
  process.on('uncaughtException', (error) => {
    console.error('[CRASH] Yakalanmamış istisna:', error && error.message);
    recordCrash();
    withTimeout(report({ eventType: 'uncaught_exception', severity: 'fatal', process: 'main', error, module: 'main' }), 3000)
      .finally(() => app.quit());
  });

  // PRD §10: unhandledRejection uygulamayı KAPATMIYOR, sadece raporlanıyor —
  // aksi halde tek bir kaçırılmış .catch() tüm uygulamayı kapatırdı.
  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    console.error('[CRASH] Yakalanmamış promise reddi:', error.message);
    report({ eventType: 'unhandled_rejection', severity: 'error', process: 'main', error, module: 'main' }).catch(() => {});
  });
}

// ─── Crash loop koruması / Safe Mode (PRD §35-36) ─────────────────────────
function recordCrash() {
  const history = loadJson(getHistoryPath(), { crashes: [], needsSafeModePrompt: false });
  const now = Date.now();
  history.crashes = (history.crashes || []).filter((t) => now - t < CRASH_LOOP_WINDOW_MS);
  history.crashes.push(now);
  if (history.crashes.length >= CRASH_LOOP_THRESHOLD) {
    history.needsSafeModePrompt = true;
  }
  saveJson(getHistoryPath(), history);
}

// Uygulama açılışında bir kere kontrol edilir (main.js) — true dönerse renderer
// "Normal Başlat / Güvenli Modda Başlat" ekranını gösterir, resolveSafeModePrompt
// çağrılana kadar (ve bu oturumda) otomatik backup/update tetiklemeleri atlanır.
function checkSafeModePrompt() {
  return !!loadJson(getHistoryPath(), {}).needsSafeModePrompt;
}

function resolveSafeModePrompt(enterSafeMode) {
  saveJson(getHistoryPath(), { crashes: [], needsSafeModePrompt: false });
  safeModeActive = !!enterSafeMode;
}

function isSafeMode() { return safeModeActive; }

module.exports = {
  init,
  initGlobalHandlers,
  report,
  reportFromRenderer,
  getReportingEnabled,
  setReportingEnabled,
  checkSafeModePrompt,
  resolveSafeModePrompt,
  isSafeMode,
};
