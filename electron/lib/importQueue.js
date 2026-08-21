// Eklenti /import ile SADECE dosyayı diske kaydettiriyor (bkz. localServer.js) —
// OCR/metin çıkarımı ve backend'e kayıt burada, indirme tamamen bittikten
// (son dosyadan DEBOUNCE_MS sonra sessizlik) sonra, ayrı bir toplu adım olarak
// yapılıyor. İndirme (eklenti) ile dönüştürme (uygulama) böylece tamamen ayrışmış
// oluyor — indirme sırasında hiçbir backend/OCR çağrısı yapılmıyor.
//
// Durum bir JSON dosyasında (userData/dosyalar/.import-state.json) tutuluyor, bu
// sayede:
// - Uygulama kapanıp açılsa da işlenmemiş/hatalı dosyalar bir sonraki açılışta
//   veya bir sonraki indirmeden sonra otomatik tekrar denenir (MAX_ATTEMPTS'e kadar).
// - Aynı isimli ama farklı tarihli evraklar (örn. "boş müzekkere şablonu") diske
//   farklı dosya adlarıyla yazıldığı için (saveEvrak dosya adına tarihi ekliyor)
//   burada da ayrı kayıtlar olarak takip ediliyor, birbirinin yerine geçmiyor.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { extractFromBuffer } = require('./extractText');
const { sanitizeName, getDosyalarRoot } = require('./fileStore');
const localDataStore = require('./localDataStore');

// Not: Çok büyük (1000+ evraklık) tek seferlik bir toplu işlemede bir kere SIGSEGV
// ile çökmüştük; o zaman zaman aşımı/oturum-bekletme gibi başka sorunlar da vardı
// ve kök sebep kesin olarak eşzamanlılık olarak doğrulanamadı (tesseract.js'in uzun
// süredir çalışan tek bir process içinde biriken kaynak sorunu da olabilir). Kullanıcı
// her evrağın kendi OCR'ının paralel, gecikmeden başlamasını istediği için 2'ye
// çıkarıldı — sorun tekrarlarsa CPU/OCR ağırlıklı işler için ayrı bir çocuk süreç
// (child_process/worker_threads) düşünülmeli.
const CONCURRENCY = 2;
const DEBOUNCE_MS = 8000; // son dosya geldikten sonra bu kadar sessizlik = "indirme bitti" say
// Tek denemede hata alırsa (örn. o an geçici bir ağ/oturum sorunu) evrağı
// sessizce arka planda tekrar tekrar denemek yerine hemen "Başarısız" olarak
// göster — kullanıcı Belgeler ekranındaki "Yeniden İşle" ile elle tetikliyor.
const MAX_ATTEMPTS = 1;

let manifest = {}; // relativePath -> { caseTitle, name, ext, absolutePath, status, attempts, lastError, updatedAt }
let manifestLoaded = false;
let debounceTimer = null;
let processing = false;
let _getAuthToken = () => null;
let _backendUrl = '';

function getCaseFolderName(caseTitle, relPath) {
  if (relPath && relPath.includes(path.sep)) {
    const firstPart = relPath.split(path.sep)[0];
    if (firstPart && firstPart !== '.' && firstPart !== '..') {
      return firstPart;
    }
  }
  if (caseTitle) {
    return sanitizeName(caseTitle);
  }
  return '';
}

function loadManifest() {
  manifest = {};
  const root = getDosyalarRoot();
  if (!fs.existsSync(root)) {
    manifestLoaded = true;
    return;
  }

  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });

    // 1) Eski global .import-state.json dosyası varsa oku (otomatik geçiş için)
    const legacyPath = path.join(root, '.import-state.json');
    if (fs.existsSync(legacyPath)) {
      try {
        const legacyData = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
        for (const [key, val] of Object.entries(legacyData)) {
          manifest[key] = val;
        }
      } catch (_) {}
    }

    // 2) Her dava klasörünün kendi .import-state.json dosyasını oku
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const caseStatePath = path.join(root, entry.name, '.import-state.json');
        if (fs.existsSync(caseStatePath)) {
          try {
            const caseData = JSON.parse(fs.readFileSync(caseStatePath, 'utf8'));
            for (const [subKey, val] of Object.entries(caseData)) {
              let fullRelPath = subKey;
              if (!subKey.startsWith(entry.name)) {
                fullRelPath = path.join(entry.name, subKey);
              }
              manifest[fullRelPath] = val;
            }
          } catch (_) {}
        }
      }
    }

    // Eğer uygulama çöktüyse veya kapandıysa, 'pending' kalmış evrakları kurtaralım
    let changed = false;
    for (const key of Object.keys(manifest)) {
      if (manifest[key].status === 'pending' && manifest[key].attempts >= MAX_ATTEMPTS) {
        manifest[key].attempts = 0;
        changed = true;
      }
    }

    // Eski global dosya varsa veya güncelleme yapıldıysa yeni dava bazlı formatta kaydet
    if (fs.existsSync(legacyPath)) {
      saveManifest();
      try { fs.unlinkSync(legacyPath); } catch (_) {}
    } else if (changed) {
      saveManifest();
    }
  } catch (err) {
    console.error('[importQueue] Dava durum dosyaları okunamadı:', err.message);
  }
  manifestLoaded = true;
}

function saveManifest() {
  try {
    const root = getDosyalarRoot();
    const caseManifests = new Map();

    for (const [relPath, entry] of Object.entries(manifest)) {
      const folderName = getCaseFolderName(entry.caseTitle, relPath);
      if (!caseManifests.has(folderName)) {
        caseManifests.set(folderName, {});
      }

      let subKey = relPath;
      if (folderName && relPath.startsWith(folderName + path.sep)) {
        subKey = relPath.slice(folderName.length + 1);
      }
      caseManifests.get(folderName)[subKey] = entry;
    }

    // Her davanın kayıtlarını kendi klasörü içindeki .import-state.json dosyasına yaz
    for (const [folderName, caseEntries] of caseManifests.entries()) {
      let targetPath;
      if (!folderName) {
        targetPath = path.join(root, '.import-state.json');
      } else {
        const caseDir = path.join(root, folderName);
        fs.mkdirSync(caseDir, { recursive: true });
        targetPath = path.join(caseDir, '.import-state.json');
      }
      fs.writeFileSync(targetPath, JSON.stringify(caseEntries, null, 2));
    }
  } catch (e) {
    console.error('[importQueue] Dava durum dosyaları yazılamadı:', e.message);
  }
}

function init({ getAuthToken, backendUrl }) {
  _getAuthToken = getAuthToken || _getAuthToken;
  _backendUrl = backendUrl || _backendUrl;
  loadManifest();
}

// saveEvrak() diske yazdıktan hemen sonra çağrılır. Burada backend/OCR YOK —
// sadece "işlenmeyi bekliyor" kaydı düşülüp indirme akışı devam ediyor.
function recordImportedFile({ caseTitle, caseCategory, name, ext, relativePath, absolutePath }) {
  if (!manifestLoaded) loadManifest();
  const existing = manifest[relativePath];
  if (existing && existing.status === 'done') return; // gerçekten aynı dosya, zaten işlenmiş
  manifest[relativePath] = {
    caseTitle, caseCategory, name, ext, absolutePath,
    status: 'pending',
    attempts: existing ? existing.attempts : 0,
    lastError: null,
    updatedAt: Date.now(),
  };
  saveManifest();
  scheduleProcessing();
}

function scheduleProcessing() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    processAll().catch((e) => console.error('[importQueue] Toplu işleme hatası:', e));
  }, DEBOUNCE_MS);
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} zaman aşımına uğradı (${ms / 1000}sn)`)), ms)),
  ]);
}

async function processOne(relPath, entry) {
  // Token yoksa (uygulama daha yeni açıldı, oturum henüz senkron olmadı vb.) hiç
  // uğraşmadan atla — ne OCR gibi pahalı bir işe girsin ne de bunu "hata" sayıp
  // deneme hakkı harcasın. Dosya 'pending' kalır, token geldiğinde (set-auth-token
  // IPC handler'ı) otomatik tekrar denenir.
  if (!_getAuthToken()) return;

  entry.attempts += 1;
  entry.updatedAt = Date.now();
  try {
    const buffer = fs.readFileSync(entry.absolutePath);
    let extractedText = '';
    let extractionError = null;
    try {
      // OCR artık self-hosted DeepSeek-OCR'a (backend üzerinden) sayfa sayfa,
      // SIRALI gidiyor — gerçek UYAP evraklarında 30 sayfaya kadar TIFF gördük,
      // her sayfa ayrı bir ağ isteği demek. Eski 120sn sınırı çok sayfalı bir
      // dosyayı OCR gerçekten çalışırken bile "zaman aşımı" ile hatalı gösterirdi;
      // 15 dakikaya çıkardık (yine de gerçekten asılı kalan bir isteğe karşı üst
      // sınır var, sonsuza kadar beklemiyoruz).
      extractedText = (await withTimeout(extractFromBuffer(buffer, entry.ext, {
        backendUrl: _backendUrl,
        getAuthToken: _getAuthToken,
      }), 900000, 'Metin çıkarma')) || '';
      console.log(`[importQueue] Metin çıkarma sonucu (${relPath}): ${extractedText.length} karakter${extractedText.trim() ? '' : ' — BOŞ (hata fırlatılmadı, ama içerik yok)'}`);
    } catch (e) {
      extractionError = e.message || String(e);
      console.error(`[importQueue] Metin çıkarılamadı (${relPath}):`, extractionError);
    }
    const token = _getAuthToken();
    if (!token) {
      // İşlem sırasında (OCR uzun sürdüyse) oturum düşmüş olabilir — yine deneme
      // hakkı harcamadan atla.
      entry.attempts -= 1;
      return;
    }
    // Bu istek backend'de sadece kayıt değil, senkron bir AI analizi de tetikliyor
    // (registerLocalDocument → runDocumentAnalysis) — o da artık aynı paylaşılan
    // GPU kuyruğundan (Faz 1, withAiQueue) geçiyor. DeepSeek-OCR yoğunken bu istek
    // kuyrukta 60sn'yi kolayca aşabiliyor (gerçek kullanımda gözlemlendi) — 5
    // dakikaya çıkarıyoruz.
    const res = await withTimeout(fetch(`${_backendUrl}/documents/register-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ case_title: entry.caseTitle, filename: `${entry.name}.${entry.ext}`, extracted_text: extractedText }),
    }), 300000, 'Backend kaydı');
    const responseData = await res.json().catch(() => ({}));
    if (!res.ok) {
      entry.status = 'error';
      entry.lastError = responseData.error || `HTTP ${res.status}`;
    } else {
      // Faz 1 çift yazma: backend'in döndürdüğü (Postgres'e zaten yazılmış)
      // satırları aynı şekilde yerel SQLite'a da yaz. Başarısız olsa bile asıl
      // import durumunu etkilemez — Postgres zaten güncel, yerel kopya bir
      // sonraki turda (dosya tekrar işlenirse) yeniden denenebilir.
      try {
        if (responseData?.case_id) {
          localDataStore.upsertCaseMeta({ caseTitle: entry.caseTitle, caseId: responseData.case_id, title: entry.caseTitle });
        }
        if (responseData?.document) {
          localDataStore.saveDocument({
            caseTitle: entry.caseTitle,
            caseId: responseData.case_id,
            document: {
              id: responseData.document.id,
              filename: responseData.document.filename,
              mime_type: responseData.document.mime_type,
              file_size: responseData.document.file_size,
              ocr_status: responseData.document.ocr_status,
              extracted_text: responseData.document.extracted_text,
              uploaded_at: responseData.document.uploaded_at || responseData.document.created_at,
            },
          });
        }
        if (responseData?.analysis) {
          localDataStore.saveAnalysis({ caseTitle: entry.caseTitle, caseId: responseData.case_id, analysis: responseData.analysis });
        }
      } catch (dualWriteErr) {
        console.error(`[importQueue] Yerel SQLite çift yazma başarısız (${relPath}):`, dualWriteErr.message);
      }
    }
    if (res.ok && (extractionError || !extractedText.trim())) {
      // Belge backend'e kaydedildi (görünür durumda) ama OCR/metin çıkarma
      // gerçekte başarısız oldu ya da boş sonuç döndürdü — eskiden bu durum
      // sessizce "done" işaretlenip lastError null'lanıyordu, bu yüzden "Yeniden
      // İşle" her denemede aynı sessiz sonuca dönüp duruyordu. Artık 'error'
      // olarak işaretliyoruz ki gerçek neden görünür olsun ve normal
      // başarısız-yeniden-deneme akışına girsin.
      entry.status = 'error';
      entry.lastError = extractionError || 'OCR/metin çıkarma boş sonuç döndürdü.';
    } else if (res.ok) {
      entry.status = 'done';
      entry.lastError = null;
    }
  } catch (e) {
    entry.status = 'error';
    entry.lastError = e.message || String(e);
    console.error(`[importQueue] İşlenemedi (${relPath}):`, entry.lastError);
  }
  manifest[relPath] = entry;
  saveManifest();
}

// Büyük bir dava dosyası (örn. 1000+ evrak) kuyrukta başka bir küçük dosyadan önce
// sıraya girdiyse, düz sıralama küçük dosyayı süresiz "açlığa" (starvation)
// düşürüyordu — tek işçili (CONCURRENCY=1) kuyrukta büyük dosya bitene kadar
// diğerlerine hiç sıra gelmiyordu. Dava başına round-robin yaparak her dosyanın
// dönüşümlü olarak ilerlemesini sağlıyoruz.
function roundRobinByCase(entries) {
  const byCase = new Map();
  for (const item of entries) {
    const key = item[1].caseTitle || '';
    if (!byCase.has(key)) byCase.set(key, []);
    byCase.get(key).push(item);
  }
  const queues = Array.from(byCase.values());
  const result = [];
  let more = true;
  while (more) {
    more = false;
    for (const q of queues) {
      if (q.length > 0) {
        result.push(q.shift());
        more = true;
      }
    }
  }
  return result;
}

// Belgeler ekranındaki evraklar süresiz "İşleniyor…" gösterip hiç ilerlemiyorsa,
// en sık sebep bu: ana sürece henüz (veya artık) bir oturum token'ı ulaşmamış —
// processAll() bu durumda hiçbir dosyaya dokunmadan hemen çıkıyor (aşağıda). UI
// bunu "gerçekten işleniyor" ile "token bekleniyor" olarak ayırt edebilsin diye
// (bkz. IPC 'has-import-auth').
function hasAuthToken() {
  return !!_getAuthToken();
}

// Belgeler ekranındaki manuel "Şimdi Dene" butonu — token varsa kuyruğu hemen
// bir kez daha çalıştırır (örn. token az önce geldiyse veya kuyruk bir şekilde
// hiç tetiklenmemişse elle bir nudge vermek için).
function runQueueNow() {
  processAll().catch((e) => console.error('[importQueue] Manuel tetikleme hatası:', e));
}

let rerunRequested = false;

// Bekleyen ya da daha önce hata almış (MAX_ATTEMPTS'i aşmamış) tüm dosyaları işler.
// Hem debounce ile (bir indirme dalgası bittiğinde) hem uygulama açılışında (bir
// önceki oturumdan kalan işlenmemiş dosyalar için) hem de oturum token'ı yeni
// geldiğinde çağrılıyor. Zaten çalışıyorsa hemen dönmüyor — bir sonraki tur talebi
// düşüp mevcut tur bitince otomatik tekrar başlıyor. Bu, örn. uygulama açılışında
// büyük bir toplu işleme sürerken oturum token'ının biraz gecikmeli gelmesi gibi
// durumlarda o anda "oturum yok" diye hataya düşen dosyaların, token geldikten
// sonra elle bir şey yapmaya gerek kalmadan otomatik tekrar denenmesini sağlıyor.
async function processAll() {
  if (processing) {
    rerunRequested = true;
    return;
  }
  processing = true;
  try {
    do {
      rerunRequested = false;
      // Token hiç yoksa bu turu hiç başlatma — yoksa yüzlerce dosyayı anında
      // "oturum yok" diye tek tek eleyip zaman kaybederiz. set-auth-token IPC
      // handler'ı token gelince processAll()'u zaten tekrar tetikliyor.
      if (!_getAuthToken()) break;
      if (!manifestLoaded) loadManifest();
      const rawTodo = Object.entries(manifest).filter(([, v]) => v.status !== 'done' && v.attempts < MAX_ATTEMPTS);
      if (rawTodo.length === 0) break;
      const todo = roundRobinByCase(rawTodo);
      console.log(`[importQueue] İşleniyor: ${todo.length} dosya`);
      let idx = 0;
      async function worker() {
        while (idx < todo.length) {
          const [relPath, entry] = todo[idx++];
          // Electron ana sürecinin OOM/donma yaşamasını önlemek için olay döngüsüne (event loop) nefes aldır
          await new Promise(resolve => setTimeout(resolve, 60));
          await processOne(relPath, entry);
        }
      }
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
      console.log('[importQueue] Tur tamamlandı.');
    } while (rerunRequested);
  } finally {
    processing = false;
  }
}

const TR_ASCII_MAP = {
  'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G',
  'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O',
  'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
};

function normalizeForMatching(str) {
  if (!str) return '';
  return String(str)
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_ASCII_MAP[ch] || ch)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function matchesCaseTitle(targetCaseTitle, fileCaseTitle, relPath) {
  if (!targetCaseTitle) return true;
  const targetNorm = normalizeForMatching(targetCaseTitle);
  if (!targetNorm) return true;

  const fileTitleNorm = normalizeForMatching(fileCaseTitle);
  const relPathNorm = normalizeForMatching(relPath);

  if (fileTitleNorm && (fileTitleNorm === targetNorm || fileTitleNorm.includes(targetNorm) || targetNorm.includes(fileTitleNorm))) {
    return true;
  }
  if (relPathNorm && relPathNorm.includes(targetNorm)) {
    return true;
  }

  // Dava esas/soruşturma numarasını çıkar (Örn: "2026/498" veya "2026_498")
  const caseNoMatch = targetCaseTitle.match(/(20[0-9]{2}[\/_.-]?[0-9]+)/);
  if (caseNoMatch) {
    const caseNoNorm = normalizeForMatching(caseNoMatch[1]);
    if (caseNoNorm && caseNoNorm.length >= 5) {
      if (fileTitleNorm.includes(caseNoNorm) || relPathNorm.includes(caseNoNorm)) {
        return true;
      }
    }
  }

  return false;
}

// Belirli bir dava başlığına ait henüz tamamlanmamış (pending/processing/error) kayıtları döner
function getEntriesForCase(caseTitle) {
  if (!manifestLoaded) loadManifest();
  return Object.entries(manifest)
    .filter(([relativePath, e]) => matchesCaseTitle(caseTitle, e.caseTitle, relativePath) && e.status !== 'done')
    .map(([relativePath, e]) => {
      const isStuck = e.status === 'pending' && e.attempts >= MAX_ATTEMPTS;
      return {
        relativePath,
        name: e.name,
        ext: e.ext,
        status: isStuck ? 'error' : e.status,
        attempts: e.attempts,
        maxAttempts: MAX_ATTEMPTS,
        lastError: isStuck ? 'İşlem yarıda kesildi (Uygulama kapanmış olabilir)' : e.lastError,
        updatedAt: e.updatedAt,
      };
    });
}

function retryEntry(relativePath) {
  if (!manifestLoaded) loadManifest();
  const entry = manifest[relativePath];
  if (!entry) return false;
  entry.status = 'pending';
  entry.attempts = 0;
  entry.lastError = null;
  entry.updatedAt = Date.now();
  manifest[relativePath] = entry;
  saveManifest();
  processAll().catch((e) => console.error('[importQueue] Yeniden işleme hatası:', e));
  return true;
}

function retryCaseFailures(caseTitle) {
  if (!manifestLoaded) loadManifest();
  let count = 0;
  for (const [relPath, e] of Object.entries(manifest)) {
    if (matchesCaseTitle(caseTitle, e.caseTitle, relPath) && e.status === 'error') {
      e.status = 'pending';
      e.attempts = 0;
      e.lastError = null;
      e.updatedAt = Date.now();
      manifest[relPath] = e;
      count += 1;
    }
  }
  if (count > 0) {
    saveManifest();
    processAll().catch((e) => console.error('[importQueue] Toplu yeniden işleme hatası:', e));
  }
  return count;
}

function purgeCaseFiles(caseTitle) {
  if (!manifestLoaded) loadManifest();
  let removed = 0;
  for (const [relPath, e] of Object.entries(manifest)) {
    if (matchesCaseTitle(caseTitle, e.caseTitle, relPath)) {
      delete manifest[relPath];
      removed += 1;
    }
  }
  if (removed > 0) saveManifest();

  let folderRemoved = false;
  try {
    const dir = path.join(getDosyalarRoot(), sanitizeName(caseTitle || 'dosyasiz'));
    fs.rmSync(dir, { recursive: true, force: true });
    folderRemoved = true;
  } catch (e) {
    console.error('[importQueue] Dava klasörü silinemedi:', e.message);
  }

  console.log(`[importQueue] Silindi: ${caseTitle} (${removed} kuyruk kaydı, klasör: ${folderRemoved})`);
  return { removedManifestEntries: removed, folderRemoved };
}

// Yerel disk klasörünü (userData/dosyalar) tarar.
// Eksik/yeni evraklar veya sonradan klasöre kopyalanmış dosyalar varsa manifest'e ekler.
function scanDiskFolder(caseTitle) {
  if (!manifestLoaded) loadManifest();
  const root = getDosyalarRoot();
  if (!fs.existsSync(root)) return 0;

  let addedCount = 0;

  function walkDir(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).replace('.', '').toLowerCase();
        const validExts = ['udf', 'pdf', 'doc', 'docx', 'tif', 'tiff', 'jpg', 'jpeg', 'png'];
        if (!validExts.includes(ext)) continue;
        if (entry.name.startsWith('.')) continue;

        const relPath = path.relative(root, fullPath);
        
        if (caseTitle && !matchesCaseTitle(caseTitle, '', relPath)) {
          continue;
        }

        const parts = relPath.split(path.sep);
        let derivedCaseTitle = caseTitle || parts[0] || 'Genel';
        if (parts.length > 2) {
          derivedCaseTitle = parts[1];
        }

        const existing = manifest[relPath];
        if (!existing || existing.status === 'error' || existing.status === 'pending') {
          manifest[relPath] = {
            caseTitle: derivedCaseTitle,
            caseCategory: parts.length > 2 ? parts[0] : 'Genel Evrak',
            name: path.basename(entry.name, '.' + ext),
            ext,
            absolutePath: fullPath,
            status: 'pending',
            attempts: 0,
            lastError: null,
            updatedAt: Date.now(),
          };
          addedCount++;
        }
      }
    }
  }

  walkDir(root);

  if (addedCount > 0) {
    saveManifest();
    console.log(`[importQueue] Disk taraması tamamlandı: ${addedCount} yeni/yeniden eklenen evrak tespit edildi.`);
  }

  return addedCount;
}

module.exports = { init, recordImportedFile, processAll, getEntriesForCase, purgeCaseFiles, retryEntry, retryCaseFailures, hasAuthToken, runQueueNow, scanDiskFolder };
