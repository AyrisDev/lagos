const { app, BrowserWindow, ipcMain, shell, session, Menu } = require('electron');
const path = require('path');
const serve = require('electron-serve').default || require('electron-serve');
const { startLocalServer, stopLocalServer } = require('./lib/localServer');
const importQueue = require('./lib/importQueue');
const { exportTextAsPdf } = require('./lib/pdfExport');
const licenseService = require('./lib/licenseService');
const updateService = require('./lib/updateService');
const backupQueue = require('./lib/backupQueue');
const restoreQueue = require('./lib/restoreQueue');
const crashReporter = require('./lib/crashReporter');
const localDataStore = require('./lib/localDataStore');
const isDev = !app.isPackaged;

// Global hata yakalayıcıları (uncaughtException/unhandledRejection) MÜMKÜN
// OLDUĞUNCA ERKEN bağlanıyor — app.on('ready')'den bile önce, ki modül
// yüklenirken (require zinciri) oluşabilecek bir hata da yakalanabilsin.
crashReporter.initGlobalHandlers();

const loadApp = serve({ directory: 'out' });

// Renderer'ın ağ üzerinden doğrudan konuştuğu tek iki host (bkz. localServer.js'teki
// aynı fallback deseni — paketlenmiş build'de .env bulunmadığından bu sabitler
// devreye giriyor). CSP'nin connect-src'i SADECE bunlara + kendi origin'imize izin
// veriyor (bkz. applyProductionCsp). NOT: Supabase burada bilerek http:// —
// mevcut self-hosted Supabase/Kong kurulumu TLS sonlandırmıyor; bu PRD kapsamında
// düzeltilebilecek bir Electron kod sorunu değil, altyapı tarafında ele alınmalı.
const SUPABASE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supa.ayris.tech';
const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'https://apexapi.ayris.tech').replace(/\/api\/?$/, '');

// Production'da renderer'a uygulanan Content-Security-Policy (PRD §19). Dev modda
// uygulanmıyor — Next.js'in kendi geliştirme sunucusu/HMR'ı zaten farklı bir
// origin ve inline eval gerektiriyor, o yüzden ayrım isDev'e göre yapılıyor (§46).
//
// script-src'te 'unsafe-inline' bilinçli bir istisna: layout.tsx'teki tema
// init script'i (next/script strategy="beforeInteractive") tek, sabit, birinci
// taraf bir inline script — hash-pinning Next'in build çıktısındaki tam
// serileştirmeye bağımlı olacağından (kırılgan, canlı test edemediğim bir
// riskle), burada güvenlik/kırılma riski dengesi bilinçli olarak bu yönde
// tutuldu. Uygulamanın hiçbir yerinde kullanıcı/uzak içerikten HTML/script
// render edilmiyor (dangerouslySetInnerHTML yok), o yüzden pratik XSS riski düşük.
function applyProductionCsp() {
  const connectSrc = ["'self'", API_ORIGIN, SUPABASE_ORIGIN].join(' ');
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });
}

// webPreferences.devTools:false, klavye kısayolunu (Cmd/Ctrl+Shift+I) ve
// programatik openDevTools() çağrılarını engelliyor ama Electron'un
// VARSAYILAN uygulama menüsündeki View > "Toggle Developer Tools" öğesini
// engellemiyor — bir menü hiç tanımlanmadığında o varsayılan menü aktif
// kalıyor. PRD §21 "ne menüden ne kısayoldan açılabilir" dediği için
// production'da DevTools/Reload/Force Reload içermeyen kendi menümüzü
// kuruyoruz; geri kalan (Edit: kopyala/yapıştır, Window, macOS'ta uygulama
// menüsü) kullanıcı için faydalı olduğundan korunuyor.
function buildProductionMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),
    {
      label: 'Düzen',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'Pencere',
      submenu: [
        {
          label: 'Ayris Legal\'ı Göster',
          click: () => {
            if (!mainWindow || mainWindow.isDestroyed()) {
              createWindow();
            } else {
              mainWindow.show();
              mainWindow.focus();
            }
          },
        },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'close' },
        ...(isMac ? [{ role: 'zoom' }, { type: 'separator' }, { role: 'front' }] : []),
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

let mainWindow;
// Giriş yapan kullanıcının Supabase access_token'ı — renderer'dan IPC ile güncellenir,
// yerel köprü sunucusunun backend'i (AI analizi için) çağırabilmesi için kullanılır.
let currentAuthToken = null;

// JWT'nin İMZASINI doğrulamıyor (buna gerek yok — backend zaten kendi
// isteklerinde tam doğrulama yapıyor), sadece crash report'lara "hangi
// kullanıcı etkilendi" bilgisini eklemek için 'sub' claim'ini okuyor.
function decodeJwtSub(token) {
  try {
    const payloadB64 = token.split('.')[1];
    const json = Buffer.from(payloadB64, 'base64').toString('utf8');
    return JSON.parse(json).sub || null;
  } catch {
    return null;
  }
}

ipcMain.on('set-auth-token', (_event, token) => {
  currentAuthToken = typeof token === 'string' && token ? token : null;
  // Oturum yeni açıldıysa/yenilendiyse, daha önce "oturum yok" diye bekleyen
  // içe aktarımları hemen tekrar dene.
  if (currentAuthToken) importQueue.processAll();
});

ipcMain.handle('open-local-file', (_event, filePath) => {
  if (typeof filePath === 'string' && filePath) {
    shell.showItemInFolder(filePath);
  }
});

// Dosya Ayrıntı ekranının, henüz backend'e kaydedilmemiş (indirildi ama işlenme
// sırasında bekleyen/hata alan) evrakları da gösterebilmesi için.
ipcMain.handle('get-import-status', (_event, caseTitle) => {
  return importQueue.getEntriesForCase(caseTitle);
});

// Bir dava dosyası silindiğinde (Cases()/Chat() delete), kuyrukta bekleyen
// kayıtları ve yereldeki dava klasörünü de temizler — yoksa arka plandaki işleme
// case'i sessizce geri yaratır.
ipcMain.handle('purge-case-files', (_event, caseTitle) => {
  return importQueue.purgeCaseFiles(caseTitle);
});

// Belgeler ekranındaki "Yeniden İşle" (tek evrak, MAX_ATTEMPTS'e ulaşıp
// "Başarısız" kalmış olanlar için) ve "Başarısızları Yeniden Dene" (toplu).
ipcMain.handle('retry-import-entry', (_event, relativePath) => {
  return importQueue.retryEntry(relativePath);
});

ipcMain.handle('retry-case-imports', (_event, caseTitle) => {
  return importQueue.retryCaseFailures(caseTitle);
});

// Evraklar süresiz "İşleniyor…" gösterip hiç ilerlemiyorsa en sık sebep ana
// sürece bir oturum token'ının ulaşmamış olması — Belgeler ekranı bunu kontrol
// edip kullanıcıya net bir uyarı + manuel "Şimdi Dene" gösterebilsin diye.
ipcMain.handle('has-import-auth', () => {
  return importQueue.hasAuthToken();
});

ipcMain.handle('scan-case-folder', (_event, caseTitle) => {
  const added = importQueue.scanDiskFolder(caseTitle);
  importQueue.runQueueNow();
  return added;
});

ipcMain.handle('run-import-queue', () => {
  importQueue.runQueueNow();
  return true;
});

// Uygulama sürümünü renderer'a bildiriyor — kullanıcı hangi sürümde
// olduğunu görebilsin, otomatik güncellemenin gerçekten çalışıp
// çalışmadığını (destek/hata ayıklama için) kendisi teyit edebilsin.
ipcMain.handle('app:get-version', () => app.getVersion());



// E-posta + şifre ile kayıt (renderer'dan çağrılır, bkz. src/app/login/page.tsx).
// Device ID bu süreçten alınır ve backend'e iletilir — aynı cihazda ikinci
// trial kaydını backend engelleyebilsin diye.
ipcMain.handle('auth:register', async (_event, { email, password }) => {
  const deviceId = licenseService.getDeviceId();
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'https://apexapi.ayris.tech/api').replace(/\/+$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, device_id: deviceId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (e) {
    console.error('[main] auth:register fetch error:', e && e.message);
    return { ok: false, status: 0, data: { error: 'İnternet bağlantısı gerekli.' }, networkError: true };
  }
});

// Otomatik güncelleme (bkz. electron/lib/updateService.js) — renderer'daki
// UpdateGate, lisans doğrulandıktan SONRA bu IPC'leri çağırıyor (App Start →
// License Valid → Update Check sırası burada değil, renderer'da sağlanıyor).
ipcMain.handle('update:check', () => {
  // PRD §36 Safe Mode: crash loop'undan sonraki (ya da içindeki) oturumda
  // update kontrolü otomatik başlatılmıyor.
  if (crashReporter.checkSafeModePrompt() || crashReporter.isSafeMode()) {
    return { checked: false, safeMode: true };
  }
  return updateService.checkForUpdates();
});
ipcMain.handle('update:download', () => updateService.downloadUpdate());
ipcMain.handle('update:install', () => updateService.installUpdate());

// Google Drive Backup (bkz. electron/lib/backupQueue.js) — asıl Drive çağrısı
// backend'de yapılıyor, burası sadece yerel tarama/kuyruk/durum köprüsü.
ipcMain.handle('backup:trigger-now', () => backupQueue.triggerNow());
ipcMain.handle('backup:get-status', () => backupQueue.getStatus());
ipcMain.handle('backup:cancel', (_event, relativePath) => backupQueue.cancelUpload(relativePath));
ipcMain.handle('backup:retry', (_event, relativePath) => backupQueue.retryFailed(relativePath));
ipcMain.handle('backup:set-auto-enabled', (_event, enabled) => backupQueue.setAutoBackupEnabled(enabled));
ipcMain.handle('backup:get-case-status', (_event, caseTitle) => backupQueue.getEntriesForCase(caseTitle));
ipcMain.handle('backup:set-scan-interval', (_event, minutes) => backupQueue.setScanIntervalMinutes(minutes));
ipcMain.handle('backup:get-all-cases-status', () => backupQueue.getAllCasesStatus());

// Yerel dava veritabanı (Faz 1 — bkz. electron/lib/localDataStore.js). Belge/
// analiz/taslak yazmaları hem Postgres'e (backend) hem buraya (dava başına
// SQLite) paralel gidiyor; okuma geçişi Faz 2'de.
ipcMain.handle('localdata:save-document', (_event, payload) => localDataStore.saveDocument(payload));
ipcMain.handle('localdata:save-analysis', (_event, payload) => localDataStore.saveAnalysis(payload));
ipcMain.handle('localdata:save-draft', (_event, payload) => localDataStore.saveDraft(payload));
ipcMain.handle('localdata:touch-case-meta', (_event, payload) => localDataStore.upsertCaseMeta(payload));
ipcMain.handle('localdata:get-case-bundle', (_event, payload) => localDataStore.getCaseBundle(payload));
ipcMain.handle('localdata:search-case', (_event, payload) => localDataStore.searchCase(payload));
ipcMain.handle('localdata:search-master-index', (_event, payload) => localDataStore.searchMasterIndex(payload));
ipcMain.handle('localdata:get-uyap-notifications', (_event, payload) => localDataStore.getUyapNotifications(payload?.limit || 30));
ipcMain.handle('localdata:get-uyap-hearings', (_event, payload) => localDataStore.getUyapHearings(payload?.limit || 100));

// Google Drive Restore (Faz 3, bkz. electron/lib/restoreQueue.js).
ipcMain.handle('restore:list-files', () => restoreQueue.listBackupFiles());
ipcMain.handle('restore:start', () => restoreQueue.startRestore());
ipcMain.handle('restore:get-status', () => restoreQueue.getStatus());

// Dış URL'yi (örn. ayrislegal.com/pricing) sistem tarayıcısında açar.
ipcMain.handle('open-external-url', (_event, url) => {
  if (typeof url === 'string' && /^https:\/\//.test(url)) {
    shell.openExternal(url);
  }
});

// Crash Reporting & Error Monitoring (bkz. electron/lib/crashReporter.js).
// device_id license sisteminden geliyor (zaten var, ek bir kimlik üretmiyoruz).
crashReporter.init({
  getDeviceId: () => licenseService.getDeviceId(),
  getUserId: () => (currentAuthToken ? decodeJwtSub(currentAuthToken) : null),
});

ipcMain.handle('crash:report', (_event, payload) => crashReporter.reportFromRenderer(payload));
ipcMain.handle('crash:get-reporting-enabled', () => crashReporter.getReportingEnabled());
ipcMain.handle('crash:set-reporting-enabled', (_event, enabled) => crashReporter.setReportingEnabled(enabled));
ipcMain.handle('crash:get-safe-mode-prompt', () => crashReporter.checkSafeModePrompt());
ipcMain.handle('crash:resolve-safe-mode', (_event, enterSafeMode) => crashReporter.resolveSafeModePrompt(enterSafeMode));

// Dilekçe Hazırlama'daki "PDF olarak indir".
ipcMain.handle('export-pdf', (event, { text, filename } = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  return exportTextAsPdf(win, text, filename);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: `AyrisLegal v${app.getVersion()}`,
    icon: path.join(__dirname, isDev ? '../public/icon.png' : '../out/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // preload.js sadece contextBridge/ipcRenderer kullanıyor (ikisi de
      // sandbox'ta desteklenen Electron yerleşikleri) — sandbox:true renderer'ı
      // OS seviyesinde ek olarak kısıtlıyor, hiçbir mevcut özelliği bozmuyor.
      sandbox: true,
      webSecurity: true,
      // PRD §21: production'da DevTools tamamen kapalı — ne menüden ne
      // klavye kısayoluyla (Cmd/Ctrl+Shift+I) açılabiliyor.
      devTools: isDev,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // window.open()/target="_blank" ile açılmaya çalışılan pencereleri Electron
  // içinde YENİ bir BrowserWindow olarak açmıyoruz (saldırı yüzeyini gereksiz
  // büyütür, PRD §15/§16) — bunun yerine http(s) ise kullanıcının sistem
  // tarayıcısında açıyoruz (zaten daha iyi bir UX: adres çubuğu, geri tuşu vb.).
  // Uygulamada Google Takvim linki, şablon indirme URL'i, Google Drive OAuth ve
  // "Planı Yükselt" gibi mevcut target="_blank" linkler bu sayede bozulmadan
  // sistem tarayıcısına yönleniyor.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    } else {
      console.error('[SECURITY] Engellenen pencere açma isteği:', url);
    }
    return { action: 'deny' };
  });

  // Ana pencerenin kendisinin beklenmedik bir origin'e (örn. bir XSS zinciriyle
  // location.href = 'https://kotu-site') yönlendirilmesini engeller — ama
  // https:// olan dış URL'leri (Google OAuth, Supabase auth) sessize almak yerine
  // sistem tarayıcısında açıyoruz. Bu sayede OAuth akışı çalışır, güvenlik korunur.
  mainWindow.webContents.on('will-navigate', (event, navUrl) => {
    try {
      const target = new URL(navUrl);
      const current = new URL(mainWindow.webContents.getURL());
      if (target.origin !== current.origin) {
        event.preventDefault();
        if (/^https:\/\//i.test(navUrl)) {
          // Güvenli dış URL (OAuth, Supabase callback vb.) → sistem tarayıcısı
          shell.openExternal(navUrl);
        } else {
          console.error('[SECURITY] Engellenen navigasyon isteği:', navUrl);
        }
      }
    } catch {
      event.preventDefault();
    }
  });


  // Renderer'ın TAMAMEN çökmesi (JS hatası değil — OOM, native crash vb.) —
  // renderer kendi başına bunu raporlayamaz çünkü artık çalışmıyor, bu yüzden
  // main process adına raporluyor (PRD §11).
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[CRASH] Renderer process gone:', details.reason);
    crashReporter.report({
      eventType: 'renderer_crash',
      severity: 'fatal',
      process: 'renderer',
      error: { name: 'RendererProcessGone', message: `reason: ${details.reason}`, stack: '' },
      module: 'renderer',
    }).catch(() => {});
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    loadApp(mainWindow);
  }

  // Next.js sayfası kendi <title>'ını ("AyrisLegal") set edince native pencere
  // başlığını ezmesin diye — sürüm numarası her zaman görünür kalsın.
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  updateService.initAutoUpdater(() => mainWindow);
  attachBackupProgressListener();
  attachRestoreProgressListener();
}

// macOS'ta createWindow() 'activate' ile tekrar çağrılabildiği için (updateService
// için de aynı sorun var, bkz. initAutoUpdater), dinleyicileri sadece bir kere bağlıyoruz.
let backupProgressListenerAttached = false;
function attachBackupProgressListener() {
  if (backupProgressListenerAttached) return;
  backupProgressListenerAttached = true;
  backupQueue.onProgress((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('backup-progress', status);
    }
  });
}

let restoreProgressListenerAttached = false;
function attachRestoreProgressListener() {
  if (restoreProgressListenerAttached) return;
  restoreProgressListenerAttached = true;
  restoreQueue.onProgress((status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('restore-progress', status);
    }
  });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // Uygulama ayrislegal:// URL'leri için varsayılan istemci olarak kaydedilir
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('ayrislegal', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('ayrislegal');
  }

  // Windows / Linux: İkinci bir instance açılmaya çalışıldığında tetiklenir (deep link)
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      // Argümanlardan URL'yi bul (ayrislegal:// ile başlayan)
      const url = commandLine.find((arg) => arg.startsWith('ayrislegal://'));
      if (url) mainWindow.webContents.send('auth:callback', url);
    }
  });

  // macOS: Uygulama çalışırken dışarıdan bir URL tıklandığında tetiklenir
  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      mainWindow.webContents.send('auth:callback', url);
    } else {
      // Pencere henüz hazır değilse, hazır olana kadar bekle
      app.once('browser-window-created', (e, window) => {
        window.webContents.once('did-finish-load', () => {
          window.webContents.send('auth:callback', url);
        });
      });
    }
  });

  app.on('ready', () => {
  if (!isDev) applyProductionCsp();
  if (!isDev) Menu.setApplicationMenu(buildProductionMenu());
  createWindow();
  startLocalServer(() => currentAuthToken);
  // Önceki oturumdan (uygulama kapanmış/çökmüş olabilir) yarım kalmış içe
  // aktarımlar varsa otomatik tekrar dene — kullanıcı token'ı henüz senkron
  // etmemiş olabileceğinden kısa bir gecikmeyle.
  setTimeout(() => importQueue.processAll(), 5000);
  // PRD §30/§31: "uygulama açıldığında" tetiklenen tarama da otomatik yedekleme
  // aç/kapa ayarına tabi — kapalıysa hiçbir şey otomatik yüklenmez, sadece
  // Ayarlar'daki "Şimdi Yedekle" (backupQueue.triggerNow, manuel) çalışır.
  // Safe Mode (PRD §36): art arda çökme tespit edildiyse (henüz kullanıcıya
  // sorulmamış OLSA bile) bu oturumda otomatik yedeklemeyi hiç başlatmıyoruz —
  // kullanıcının "Normal Başlat" seçmesi durumunda sadece bu oturum için
  // otomatik tetikleme atlanmış olur, sonraki açılış normale döner.
  setTimeout(() => {
    if (!crashReporter.checkSafeModePrompt() && backupQueue.getStatus().autoBackupEnabled) {
      backupQueue.triggerNow();
    }
  }, 6000);
});

app.on('before-quit', () => {
  stopLocalServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
}
