const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // Kullanıcı hangi sürümde olduğunu görebilsin (pencere başlığında da yazıyor
  // ama Ayarlar'da da göstermek, otomatik güncellemenin çalışıp çalışmadığını
  // teyit etmeyi kolaylaştırıyor).
  appGetVersion: () => ipcRenderer.invoke('app:get-version'),
  // Renderer'daki Supabase oturumu değiştiğinde ana sürece token'ı iletir —
  // yerel UYAP köprü sunucusu (electron/lib/localServer.js) bunu backend
  // isteklerinde kullanır.
  setAuthToken: (token) => ipcRenderer.send('set-auth-token', token),
  // Yerelde saklanan bir evrağı Finder/Explorer'da gösterir.
  openLocalFile: (filePath) => ipcRenderer.invoke('open-local-file', filePath),
  // Bir dava başlığı için, henüz backend'e kaydedilmemiş (indirildi ama işlenmeyi
  // bekleyen/hata alan) evrakların listesini döner.
  getImportStatus: (caseTitle) => ipcRenderer.invoke('get-import-status', caseTitle),
  // Dava silindiğinde kuyruktaki kayıtları ve yerel dava klasörünü temizler.
  purgeCaseFiles: (caseTitle) => ipcRenderer.invoke('purge-case-files', caseTitle),
  // Belgeler ekranındaki "Yeniden İşle" (tek evrak) / "Başarısızları Yeniden Dene" (toplu).
  retryImportEntry: (relativePath) => ipcRenderer.invoke('retry-import-entry', relativePath),
  retryCaseImports: (caseTitle) => ipcRenderer.invoke('retry-case-imports', caseTitle),
  // Evraklar süresiz "İşleniyor…" gösterip ilerlemiyorsa teşhis + manuel tetikleme.
  hasImportAuth: () => ipcRenderer.invoke('has-import-auth'),
  scanCaseFolder: (caseTitle) => ipcRenderer.invoke('scan-case-folder', caseTitle),
  runImportQueue: () => ipcRenderer.invoke('run-import-queue'),
  // E-posta ile kayıt — device_id, trial'ın aynı cihazda tekrar kullanılmasını engeller.
  authRegisterWithEmail: (email, password) => ipcRenderer.invoke('auth:register', { email, password }),
  // Otomatik güncelleme — lisans doğrulandıktan sonra çağrılır (bkz.
  // src/components/UpdateGate.tsx). update, download-progress ve downloaded
  // olayları push (ipcRenderer.on) ile geldiği için abone-ol/çık şeklinde.
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateDownload: () => ipcRenderer.invoke('update:download'),
  updateInstall: () => ipcRenderer.invoke('update:install'),
  onUpdateDownloadProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('update-download-progress', listener);
    return () => ipcRenderer.removeListener('update-download-progress', listener);
  },
  onUpdateDownloaded: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('update-downloaded', listener);
    return () => ipcRenderer.removeListener('update-downloaded', listener);
  },
  onUpdateError: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('update-error', listener);
    return () => ipcRenderer.removeListener('update-error', listener);
  },
  // Dilekçe taslağını gerçek bir PDF dosyasına çevirip kullanıcının seçtiği yere kaydeder.
  exportPdf: (text, filename) => ipcRenderer.invoke('export-pdf', { text, filename }),
  // Google Drive Backup — Ayarlar > Yedekleme (bkz. electron/lib/backupQueue.js).
  backupTriggerNow: () => ipcRenderer.invoke('backup:trigger-now'),
  backupGetStatus: () => ipcRenderer.invoke('backup:get-status'),
  backupCancel: (relativePath) => ipcRenderer.invoke('backup:cancel', relativePath),
  backupRetry: (relativePath) => ipcRenderer.invoke('backup:retry', relativePath),
  backupSetAutoEnabled: (enabled) => ipcRenderer.invoke('backup:set-auto-enabled', enabled),
  backupGetCaseStatus: (caseTitle) => ipcRenderer.invoke('backup:get-case-status', caseTitle),
  backupSetScanInterval: (minutes) => ipcRenderer.invoke('backup:set-scan-interval', minutes),
  backupGetAllCasesStatus: () => ipcRenderer.invoke('backup:get-all-cases-status'),
  onBackupProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('backup-progress', listener);
    return () => ipcRenderer.removeListener('backup-progress', listener);
  },
  // Yerel dava veritabanı (Faz 1 — bkz. electron/lib/localDataStore.js).
  localDataSaveDocument: (payload) => ipcRenderer.invoke('localdata:save-document', payload),
  localDataSaveAnalysis: (payload) => ipcRenderer.invoke('localdata:save-analysis', payload),
  localDataSaveDraft: (payload) => ipcRenderer.invoke('localdata:save-draft', payload),
  localDataTouchCaseMeta: (payload) => ipcRenderer.invoke('localdata:touch-case-meta', payload),
  localDataGetCaseBundle: (payload) => ipcRenderer.invoke('localdata:get-case-bundle', payload),
  localDataSearchCase: (payload) => ipcRenderer.invoke('localdata:search-case', payload),
  localDataSearchMasterIndex: (payload) => ipcRenderer.invoke('localdata:search-master-index', payload),
  localDataGetUyapNotifications: (payload) => ipcRenderer.invoke('localdata:get-uyap-notifications', payload),
  localDataGetUyapHearings: (payload) => ipcRenderer.invoke('localdata:get-uyap-hearings', payload),
  onUyapHearingsSynced: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('uyap-hearings-synced', listener);
    return () => ipcRenderer.removeListener('uyap-hearings-synced', listener);
  },
  onUyapNotificationsSynced: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('uyap-notifications-synced', listener);
    return () => ipcRenderer.removeListener('uyap-notifications-synced', listener);
  },
  // Dış URL'yi sistem tarayıcısında açar (örn. ayrislegal.com/pricing).
  openUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  restoreListFiles: () => ipcRenderer.invoke('restore:list-files'),
  restoreStart: () => ipcRenderer.invoke('restore:start'),
  restoreGetStatus: () => ipcRenderer.invoke('restore:get-status'),
  onRestoreProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('restore-progress', listener);
    return () => ipcRenderer.removeListener('restore-progress', listener);
  },
  // Crash Reporting & Error Monitoring (bkz. electron/lib/crashReporter.js,
  // src/components/ErrorBoundary.tsx, SafeModeGate.tsx).
  crashReport: (payload) => ipcRenderer.invoke('crash:report', payload),
  crashGetReportingEnabled: () => ipcRenderer.invoke('crash:get-reporting-enabled'),
  crashSetReportingEnabled: (enabled) => ipcRenderer.invoke('crash:set-reporting-enabled', enabled),
  crashGetSafeModePrompt: () => ipcRenderer.invoke('crash:get-safe-mode-prompt'),
  crashResolveSafeMode: (enterSafeMode) => ipcRenderer.invoke('crash:resolve-safe-mode', enterSafeMode),

});

