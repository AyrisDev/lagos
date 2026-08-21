// Dava başına yerel SQLite'a (belgeler, analizler, taslaklar) yazan/okuyan
// üst seviye API — IPC handler'ları (main.js) bu modülü çağırır.
// Her yazmadan sonra debounce'lu olarak "case.sqlite" genel anlık görüntüsü
// güncellenir (backupQueue.js bunu otomatik yakalar, bkz. localDb.js).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const { sanitizeName, getDosyalarRoot } = require('./fileStore');
const localDb = require('./localDb');

const SNAPSHOT_DEBOUNCE_MS = 8000; // importQueue.js'teki debounce ile tutarlı
const pendingSnapshots = new Map(); // caseFolderAbsolutePath -> Timeout

// Faz 4 (mobil ince-köprü) — case_id ↔ Drive'daki local_path eşleşmesini
// backend'e kaydetmek için. Diğer modüllerle (backupQueue.js vb.) aynı desen:
// localServer.js::startLocalServer içinde init() ile doldurulur.
let _getAuthToken = () => null;
let _backendUrl = '';
function init({ getAuthToken, backendUrl }) {
  _getAuthToken = getAuthToken || _getAuthToken;
  _backendUrl = backendUrl || _backendUrl;
}

// Best-effort — başarısız olursa (offline, backend erişilemez) yerel işlemi
// hiç etkilemez, sessizce loglanır. local_path DETERMİNİSTİK olduğu için
// (sanitizeName(caseTitle) + "/case.sqlite") gerçek Drive yüklemesinin
// tamamlanmasını beklemeye gerek yok, dava ilk dokunulduğunda kaydedilebilir.
async function registerCaseDrivePath(caseId, folderName) {
  const token = _getAuthToken();
  if (!token || !_backendUrl) return;
  try {
    const localPath = `${folderName}/${localDb.CASE_SNAPSHOT_FILENAME}`;
    await fetch(`${_backendUrl}/google-drive/register-case-path`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ case_id: caseId, local_path: localPath }),
    });
  } catch (e) {
    console.error('[localDataStore] case_drive_files eşleşmesi kaydedilemedi:', e.message);
  }
}

function resolveCaseFolder(caseTitle) {
  const root = getDosyalarRoot();
  const folderName = sanitizeName(caseTitle || 'dosyasiz');
  const absolutePath = path.join(root, folderName);
  fs.mkdirSync(absolutePath, { recursive: true });
  return { root, folderName, absolutePath };
}

function scheduleCaseSnapshot(caseFolderAbsolutePath) {
  const existing = pendingSnapshots.get(caseFolderAbsolutePath);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(async () => {
    pendingSnapshots.delete(caseFolderAbsolutePath);
    try {
      const db = localDb.openCaseDb(caseFolderAbsolutePath);
      const snapshotPath = path.join(caseFolderAbsolutePath, localDb.CASE_SNAPSHOT_FILENAME);
      await localDb.snapshotToPublicFile(db, snapshotPath);
    } catch (e) {
      console.error('[localDataStore] Dava anlık görüntüsü alınamadı:', e.message);
    }
  }, SNAPSHOT_DEBOUNCE_MS);
  pendingSnapshots.set(caseFolderAbsolutePath, timer);
}

function scheduleMasterSnapshot() {
  const root = getDosyalarRoot();
  const key = '__master__';
  const existing = pendingSnapshots.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(async () => {
    pendingSnapshots.delete(key);
    try {
      const db = localDb.openMasterIndexDb(root);
      const snapshotPath = path.join(root, localDb.MASTER_SNAPSHOT_FILENAME);
      await localDb.snapshotToPublicFile(db, snapshotPath);
      // masterIndexSync.js bu anlık görüntüyü Drive'a ayrıca (rezerve
      // "_master_index" case_title'ıyla) yükler — backupQueue.js'in genel
      // taraması dosyalar/ kökünü dava klasörü sanmadığı için buna girmiyor.
      try {
        require('./masterIndexSync').scheduleUpload(snapshotPath);
      } catch (e) {
        console.error('[localDataStore] masterIndexSync tetiklenemedi:', e.message);
      }
    } catch (e) {
      console.error('[localDataStore] Merkezi index anlık görüntüsü alınamadı:', e.message);
    }
  }, SNAPSHOT_DEBOUNCE_MS);
  pendingSnapshots.set(key, timer);
}

// { caseTitle, caseId, title, parties, kind } -> case_meta upsert
function upsertCaseMeta({ caseTitle, caseId, title, parties, kind }) {
  const { absolutePath, folderName } = resolveCaseFolder(caseTitle);
  const db = localDb.openCaseDb(absolutePath);
  const now = new Date().toISOString();
  const existing = caseId ? db.prepare('SELECT created_at FROM case_meta WHERE case_id = ?').get(caseId) : null;
  db.prepare(`
    INSERT INTO case_meta (case_id, title, kind, parties_json, created_at, updated_at)
    VALUES (@case_id, @title, @kind, @parties_json, @created_at, @updated_at)
    ON CONFLICT(case_id) DO UPDATE SET
      title = excluded.title, kind = excluded.kind, parties_json = excluded.parties_json, updated_at = excluded.updated_at
  `).run({
    case_id: caseId || null,
    title: title || caseTitle,
    kind: kind || 'case',
    parties_json: parties ? JSON.stringify(parties) : null,
    created_at: existing?.created_at || now,
    updated_at: now,
  });
  scheduleCaseSnapshot(absolutePath);
  upsertMasterIndexEntry({ caseId, caseTitle, folderName, title: title || caseTitle });
  if (caseId) registerCaseDrivePath(caseId, folderName).catch(() => {});
}

function upsertMasterIndexEntry({ caseId, caseTitle, folderName, title }) {
  if (!caseId) return; // korelasyon anahtarı olmadan merkezi index'e giremeyiz
  const root = getDosyalarRoot();
  const db = localDb.openMasterIndexDb(root);
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO cases_index (case_id, title, case_folder_relative_path, updated_at)
    VALUES (@case_id, @title, @path, @updated_at)
    ON CONFLICT(case_id) DO UPDATE SET title = excluded.title, case_folder_relative_path = excluded.case_folder_relative_path, updated_at = excluded.updated_at
  `).run({ case_id: caseId, title: title || caseTitle, path: folderName, updated_at: now });
  scheduleMasterSnapshot();
}

// document: { id?, filename, relative_path, mime_type, file_size, ocr_status, extracted_text, category, uploaded_at? }
function saveDocument({ caseTitle, caseId, document }) {
  const { absolutePath } = resolveCaseFolder(caseTitle);
  const db = localDb.openCaseDb(absolutePath);
  const id = document.id || crypto.randomUUID();
  const uploadedAt = document.uploaded_at || new Date().toISOString();

  // UYAP'tan aynı dosya adıyla tekrar indirme (yeniden işleme) — importQueue.js'in
  // registerLocalDocument'a yaptığı upsert-if-exists mantığıyla tutarlı davran.
  const existing = db.prepare('SELECT id FROM documents WHERE filename = ?').get(document.filename);
  if (existing) {
    db.prepare(`
      UPDATE documents SET relative_path=@relative_path, mime_type=@mime_type, file_size=@file_size,
        ocr_status=@ocr_status, extracted_text=@extracted_text, category=@category, uploaded_at=@uploaded_at
      WHERE id=@id
    `).run({ id: existing.id, relative_path: document.relative_path || null, mime_type: document.mime_type || null,
      file_size: document.file_size || null, ocr_status: document.ocr_status || 'done',
      extracted_text: document.extracted_text || '', category: document.category || null, uploaded_at: uploadedAt });
  } else {
    db.prepare(`
      INSERT INTO documents (id, filename, relative_path, mime_type, file_size, ocr_status, extracted_text, category, uploaded_at)
      VALUES (@id, @filename, @relative_path, @mime_type, @file_size, @ocr_status, @extracted_text, @category, @uploaded_at)
    `).run({ id, filename: document.filename, relative_path: document.relative_path || null,
      mime_type: document.mime_type || null, file_size: document.file_size || null,
      ocr_status: document.ocr_status || 'done', extracted_text: document.extracted_text || '',
      category: document.category || null, uploaded_at: uploadedAt });
  }
  scheduleCaseSnapshot(absolutePath);
  bumpMasterDocumentCount(caseId, absolutePath);
  return { id };
}

function bumpMasterDocumentCount(caseId, caseFolderAbsolutePath) {
  if (!caseId) return;
  try {
    const caseDb = localDb.openCaseDb(caseFolderAbsolutePath);
    const { count } = caseDb.prepare('SELECT COUNT(*) as count FROM documents').get();
    const root = getDosyalarRoot();
    const masterDb = localDb.openMasterIndexDb(root);
    masterDb.prepare('UPDATE cases_index SET document_count = ?, updated_at = ? WHERE case_id = ?')
      .run(count, new Date().toISOString(), caseId);
    scheduleMasterSnapshot();
  } catch (e) {
    console.error('[localDataStore] Merkezi index belge sayısı güncellenemedi:', e.message);
  }
}

// analysis: backend'in döndürdüğü satırla AYNI şekil — { id?, document_id, summary_json, model_used, created_at? }
// analysisType, summary_json'ın hangi anahtarı taşıdığını (deficiencyAnalysis vb.) SEÇMEK için
// CaseDetail.tsx/mobil ile aynı "şekli koklama" mantığı yerel tarafta da tekrarlanmaz;
// sadece filtreleme/arama kolaylığı için ayrıca saklanır, tüketiciler yine summary_json'a bakar.
function saveAnalysis({ caseTitle, caseId, analysis, analysisType }) {
  const { absolutePath } = resolveCaseFolder(caseTitle);
  const db = localDb.openCaseDb(absolutePath);
  const id = analysis.id || crypto.randomUUID();
  const summaryJson = typeof analysis.summary_json === 'string' ? analysis.summary_json : JSON.stringify(analysis.summary_json);
  db.prepare(`
    INSERT INTO analyses (id, document_id, analysis_type, summary_json, model_used, created_at)
    VALUES (@id, @document_id, @analysis_type, @summary_json, @model_used, @created_at)
  `).run({
    id,
    document_id: analysis.document_id || null,
    analysis_type: analysisType || inferAnalysisType(analysis.summary_json),
    summary_json: summaryJson,
    model_used: analysis.model_used || null,
    created_at: analysis.created_at || new Date().toISOString(),
  });
  scheduleCaseSnapshot(absolutePath);
  syncMasterIndexFromAnalysis({ caseId, absolutePath, summaryJsonRaw: summaryJson });
  return { id };
}

function inferAnalysisType(summaryJson) {
  const obj = typeof summaryJson === 'string' ? safeParseJson(summaryJson) : summaryJson;
  if (!obj || typeof obj !== 'object') return 'unknown';
  if (obj.deficiencyAnalysis) return 'deficiencyAnalysis';
  if (obj.statementAnalysis) return 'statementAnalysis';
  if (obj.strategyAnalysis) return 'strategyAnalysis';
  if (obj.mediationAnalysis) return 'mediationAnalysis';
  if (obj.digitalInternResult) return 'digitalInternResult';
  if (obj.ozet !== undefined || obj.summary !== undefined || obj.ilkDegerlendirme !== undefined) return 'ozet';
  return 'unknown';
}

function safeParseJson(s) {
  try { return JSON.parse(s); } catch (_) { return null; }
}

function syncMasterIndexFromAnalysis({ caseId, absolutePath, summaryJsonRaw }) {
  if (!caseId) return;
  const parsed = safeParseJson(summaryJsonRaw);
  if (!parsed) return;
  const updates = { updated_at: new Date().toISOString(), last_analysis_at: new Date().toISOString() };
  if (parsed.deficiencyAnalysis?.currentStage) {
    updates.procedural_stage = parsed.deficiencyAnalysis.currentStage;
    updates.has_deficiency = (parsed.deficiencyAnalysis.deficiencies?.length || 0) > 0 ? 1 : 0;
  }
  const ozetText = parsed.ozet || parsed.summary;
  if (typeof ozetText === 'string') {
    updates.short_summary = ozetText.slice(0, 500);
  }
  const root = getDosyalarRoot();
  const masterDb = localDb.openMasterIndexDb(root);
  const setClauses = Object.keys(updates).map((k) => `${k} = @${k}`).join(', ');
  masterDb.prepare(`UPDATE cases_index SET ${setClauses} WHERE case_id = @case_id`).run({ ...updates, case_id: caseId });
  scheduleMasterSnapshot();
}

// draft: { id?, petition_type, content, template_id, used_legislation, created_at? }
function saveDraft({ caseTitle, draft }) {
  const { absolutePath } = resolveCaseFolder(caseTitle);
  const db = localDb.openCaseDb(absolutePath);
  const id = draft.id || crypto.randomUUID();
  db.prepare(`
    INSERT INTO drafts (id, petition_type, content, template_id, used_legislation_json, created_at)
    VALUES (@id, @petition_type, @content, @template_id, @used_legislation_json, @created_at)
  `).run({
    id,
    petition_type: draft.petition_type,
    content: draft.content,
    template_id: draft.template_id || null,
    used_legislation_json: draft.used_legislation ? JSON.stringify(draft.used_legislation) : null,
    created_at: draft.created_at || new Date().toISOString(),
  });
  scheduleCaseSnapshot(absolutePath);
  return { id };
}

// CaseDetail.tsx::loadCaseData'nın bugünkü dört Supabase sorgusuyla BİREBİR
// aynı şekli döner (cData/dData/aData/drData, aynı alan adları) — component'in
// ayrıştırma mantığına hiç dokunulmasın diye.
function getCaseBundle({ caseTitle, caseId }) {
  const { absolutePath } = resolveCaseFolder(caseTitle);
  const workingPath = path.join(absolutePath, localDb.CASE_WORKING_FILENAME);
  if (!fs.existsSync(workingPath)) {
    // Taze kurulum / Drive'dan henüz senkron olmamış — boş bundle, component'in
    // mevcut "veri yok" durumları aynen devreye girer.
    return { cData: null, dData: [], aData: [], drData: [] };
  }
  const db = localDb.openCaseDb(absolutePath);

  const metaRow = db.prepare('SELECT * FROM case_meta WHERE case_id = ?').get(caseId) || db.prepare('SELECT * FROM case_meta LIMIT 1').get();
  const cData = metaRow ? {
    id: metaRow.case_id,
    title: metaRow.title,
    created_at: metaRow.created_at,
    parties: metaRow.parties_json ? safeParseJson(metaRow.parties_json) : [],
  } : null;

  const documents = db.prepare('SELECT * FROM documents ORDER BY uploaded_at DESC').all();
  const dData = documents.map((d) => ({
    id: d.id, filename: d.filename, uploaded_at: d.uploaded_at,
    extracted_text: d.extracted_text, file_size: d.file_size, category: d.category,
  }));

  const analyses = db.prepare('SELECT * FROM analyses ORDER BY created_at DESC').all();
  const aData = analyses.map((a) => ({
    id: a.id, case_id: caseId, document_id: a.document_id,
    summary_json: safeParseJson(a.summary_json), model_used: a.model_used, created_at: a.created_at,
  }));

  const drafts = db.prepare('SELECT * FROM drafts ORDER BY created_at DESC').all();
  const drData = drafts.map((d) => ({
    id: d.id, petition_type: d.petition_type, content: d.content, case_id: caseId, created_at: d.created_at,
  }));

  return { cData, dData, aData, drData };
}

// Tek bir davanın kendi FTS5 index'inde arama — { rowid'siz sonuç listesi }.
function searchCase({ caseTitle, query, limit = 20 }) {
  const { absolutePath } = resolveCaseFolder(caseTitle);
  const workingPath = path.join(absolutePath, localDb.CASE_WORKING_FILENAME);
  if (!fs.existsSync(workingPath) || !query) return [];
  const db = localDb.openCaseDb(absolutePath);
  return db.prepare(`
    SELECT d.id, d.filename, snippet(documents_fts, 1, '[', ']', '…', 12) AS snippet
    FROM documents_fts JOIN documents d ON d.rowid = documents_fts.rowid
    WHERE documents_fts MATCH ? ORDER BY rank LIMIT ?
  `).all(query, limit);
}

// Tüm arşiv genelinde (davalar arası) arama — merkezi özet index'i üzerinden.
function searchMasterIndex({ query, limit = 20 }) {
  const root = getDosyalarRoot();
  const workingPath = path.join(root, localDb.MASTER_WORKING_FILENAME);
  if (!fs.existsSync(workingPath) || !query) return [];
  const db = localDb.openMasterIndexDb(root);
  return db.prepare(`
    SELECT c.case_id, c.title, c.case_folder_relative_path, c.procedural_stage, c.has_deficiency,
           snippet(cases_index_fts, 1, '[', ']', '…', 16) AS snippet
    FROM cases_index_fts JOIN cases_index c ON c.rowid = cases_index_fts.rowid
    WHERE cases_index_fts MATCH ? ORDER BY rank LIMIT ?
  `).all(query, limit);
}

function getAllCasesFromIndex() {
  const root = getDosyalarRoot();
  const workingPath = path.join(root, localDb.MASTER_WORKING_FILENAME);
  if (!fs.existsSync(workingPath)) return [];
  const db = localDb.openMasterIndexDb(root);
  return db.prepare('SELECT * FROM cases_index ORDER BY updated_at DESC').all();
}

function saveUyapNotifications(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) return 0;
  const root = getDosyalarRoot();
  const db = localDb.openMasterIndexDb(root);
  const now = new Date().toISOString();

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO uyap_notifications (
      id, bildirim_id, mesaj_id, baslik, mesaj, dosya_no, birim_adi, kategori, gonderilme_tarihi, okundu_mu, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    let count = 0;
    for (const item of items) {
      const bildirimId = item.bildirimId || item.id || null;
      const mesajId = item.mesajId || null;
      const id = String(bildirimId || crypto.randomUUID());
      const baslik = item.baslik || 'UYAP Bildirimi';
      const mesaj = item.mesaj || item.message || '';
      
      const dosyaNoMatch = mesaj.match(/(\d{4}\/\d+)/);
      const dosyaNo = dosyaNoMatch ? dosyaNoMatch[1] : (item.dosyaNo || null);
      
      const birimMatch = mesaj.match(/^([^,]+?)(?:\s+Biriminde|\s+nin|\s+birimi|\s+Mahkemesi|\s+Dairesi|\s+Müdürlüğü)/i);
      const birimAdi = birimMatch ? birimMatch[1].trim() : (item.birimAdi || null);

      let kategori = 'GENEL';
      const bLower = (baslik + ' ' + mesaj).toLowerCase();
      if (bLower.includes('bilirkişi') || bLower.includes('mütalaa') || bLower.includes('rapor')) kategori = 'BILIRKISI';
      else if (bLower.includes('karar') || bLower.includes('tensip') || bLower.includes('gerekçeli')) kategori = 'KARAR';
      else if (bLower.includes('reddiyat') || bLower.includes('tahsilat') || bLower.includes('haciz') || bLower.includes('icra')) kategori = 'ICRA';
      else if (bLower.includes('tebligat') || bLower.includes('mazbata') || bLower.includes('müzekkere')) kategori = 'TEBLIGAT';
      else if (bLower.includes('istinaf') || bLower.includes('temyiz') || bLower.includes('itiraz') || bLower.includes('dilekçe')) kategori = 'DILEKCE';
      else if (bLower.includes('vekil') || bLower.includes('taraf') || bLower.includes('avukat')) kategori = 'VEKIL';

      let gonderilmeTarihi = now;
      if (item.gonderilmeTarihi) {
        try {
          const parsed = new Date(item.gonderilmeTarihi);
          if (!isNaN(parsed.getTime())) gonderilmeTarihi = parsed.toISOString();
        } catch (_) {}
      }
      const okunduMu = item.okunduMu ? 1 : 0;

      insertStmt.run(id, bildirimId, mesajId, baslik, mesaj, dosyaNo, birimAdi, kategori, gonderilmeTarihi, okunduMu, now);
      count++;
    }
    return count;
  });

  const inserted = insertMany(notifications);
  scheduleMasterSnapshot();
  return inserted;
}

function getUyapNotifications(limit = 30) {
  const root = getDosyalarRoot();
  const db = localDb.openMasterIndexDb(root);
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS uyap_notifications (
        id TEXT PRIMARY KEY,
        bildirim_id INTEGER UNIQUE,
        mesaj_id INTEGER,
        baslik TEXT,
        mesaj TEXT,
        dosya_no TEXT,
        birim_adi TEXT,
        kategori TEXT,
        gonderilme_tarihi TEXT,
        okundu_mu INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);
    return db.prepare(`
      SELECT * FROM uyap_notifications ORDER BY gonderilme_tarihi DESC, created_at DESC LIMIT ?
    `).all(limit);
  } catch (e) {
    console.error('[localDataStore] Bildirimler okunamadı:', e.message);
    return [];
  }
}


function saveUyapHearings(hearings = []) {
  if (!Array.isArray(hearings) || hearings.length === 0) return 0;
  const root = getDosyalarRoot();
  const db = localDb.openMasterIndexDb(root);
  const now = new Date().toISOString();

  db.exec(`
    CREATE TABLE IF NOT EXISTS uyap_hearings (
      id TEXT PRIMARY KEY,
      kayit_id INTEGER UNIQUE,
      dosya_no TEXT,
      mahkeme_adi TEXT,
      dosya_turu TEXT,
      tarih_saat TEXT NOT NULL,
      islem_turu TEXT,
      islem_sonucu TEXT,
      taraflar_json TEXT,
      created_at TEXT NOT NULL
    );
  `);

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO uyap_hearings (
      id, kayit_id, dosya_no, mahkeme_adi, dosya_turu, tarih_saat, islem_turu, islem_sonucu, taraflar_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items) => {
    let count = 0;
    for (const h of items) {
      const kayitId = h.kayitId || null;
      const id = String(kayitId || `${h.dosyaNo}_${h.tarihSaat}`);
      const dosyaNo = h.dosyaNo || '';
      const mahkemeAdi = h.yerelBirimAd || h.mahkemeAdi || '';
      const dosyaTuru = h.dosyaTurKodAciklama || h.dosyaTuru || '';
      
      let isoDate = h.tarihSaat;
      try {
        const d = new Date(h.tarihSaat.replace(' ', 'T'));
        if (!isNaN(d.getTime())) isoDate = d.toISOString();
      } catch (_) {}

      const islemTuru = h.islemTuruAciklama || h.islemTuru || 'Duruşma';
      const islemSonucu = h.islemSonucuAciklama || h.islemSonucu || 'Günü Verildi';
      const taraflarJson = JSON.stringify(h.dosyaTaraflari || []);

      insertStmt.run(id, kayitId, dosyaNo, mahkemeAdi, dosyaTuru, isoDate, islemTuru, islemSonucu, taraflarJson, now);
      count++;
    }
    return count;
  });

  const inserted = insertMany(hearings);
  scheduleMasterSnapshot();
  return inserted;
}

function getUyapHearings(limit = 100) {
  const root = getDosyalarRoot();
  const db = localDb.openMasterIndexDb(root);
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS uyap_hearings (
        id TEXT PRIMARY KEY,
        kayit_id INTEGER UNIQUE,
        dosya_no TEXT,
        mahkeme_adi TEXT,
        dosya_turu TEXT,
        tarih_saat TEXT NOT NULL,
        islem_turu TEXT,
        islem_sonucu TEXT,
        taraflar_json TEXT,
        created_at TEXT NOT NULL
      );
    `);
    return db.prepare(`SELECT * FROM uyap_hearings ORDER BY tarih_saat ASC LIMIT ?`).all(limit);
  } catch (e) {
    console.error('[localDataStore] Duruşmalar okunamadı:', e.message);
    return [];
  }
}

module.exports = {
  init,
  resolveCaseFolder,
  upsertCaseMeta,
  saveDocument,
  saveAnalysis,
  saveDraft,
  getCaseBundle,
  searchCase,
  searchMasterIndex,
  getAllCasesFromIndex,
  saveUyapNotifications,
  getUyapNotifications,
  saveUyapHearings,
  getUyapHearings,
};
