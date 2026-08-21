// Dava başına yerel SQLite dosyalarını açma/şema kurma/tutarlı anlık görüntü alma.
// İki dosya modeli kullanılır: ".case-working.sqlite" (sürekli açık, WAL modunda,
// nokta ile başladığı için backupQueue.js tarafından ATLANIR) ve "case.sqlite"
// (nokta içermez, her yazmadan sonra bu dosyaya tutarlı bir anlık görüntü —
// backupQueue.js bunu genel taramasında otomatik yakalayıp Drive'a yükler).
// Ham dosya kopyalama yerine better-sqlite3'ün Online Backup API'si kullanılır,
// böylece aktif yazma sırasında bile bozuk/yarım bir kopya Drive'a gitmez.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const CASE_SCHEMA_VERSION = 1;
const MASTER_SCHEMA_VERSION = 1;

const CASE_WORKING_FILENAME = '.case-working.sqlite';
const CASE_SNAPSHOT_FILENAME = 'case.sqlite';
const MASTER_WORKING_FILENAME = '.ayris-master-index.working.sqlite';
const MASTER_SNAPSHOT_FILENAME = '_ayris-master-index.sqlite';

const CASE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS case_meta (
  case_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT DEFAULT 'case',
  parties_json TEXT,
  schema_version INTEGER NOT NULL DEFAULT ${CASE_SCHEMA_VERSION},
  created_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  relative_path TEXT,
  mime_type TEXT,
  file_size INTEGER,
  ocr_status TEXT,
  extracted_text TEXT,
  category TEXT,
  uploaded_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  filename, extracted_text, content='documents', content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, filename, extracted_text) VALUES (new.rowid, new.filename, new.extracted_text);
END;
CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, filename, extracted_text) VALUES ('delete', old.rowid, old.filename, old.extracted_text);
END;
CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, filename, extracted_text) VALUES ('delete', old.rowid, old.filename, old.extracted_text);
  INSERT INTO documents_fts(rowid, filename, extracted_text) VALUES (new.rowid, new.filename, new.extracted_text);
END;

CREATE TABLE IF NOT EXISTS analyses (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  analysis_type TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  model_used TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  petition_type TEXT NOT NULL,
  content TEXT NOT NULL,
  template_id TEXT,
  used_legislation_json TEXT,
  created_at TEXT NOT NULL
);
`;

const MASTER_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS cases_index (
  case_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  case_folder_relative_path TEXT NOT NULL,
  court TEXT,
  procedural_stage TEXT,
  has_deficiency INTEGER DEFAULT 0,
  short_summary TEXT,
  document_count INTEGER DEFAULT 0,
  last_analysis_at TEXT,
  updated_at TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT ${MASTER_SCHEMA_VERSION}
);

CREATE VIRTUAL TABLE IF NOT EXISTS cases_index_fts USING fts5(
  title, short_summary, content='cases_index', content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS cases_index_ai AFTER INSERT ON cases_index BEGIN
  INSERT INTO cases_index_fts(rowid, title, short_summary) VALUES (new.rowid, new.title, new.short_summary);
END;
CREATE TRIGGER IF NOT EXISTS cases_index_ad AFTER DELETE ON cases_index BEGIN
  INSERT INTO cases_index_fts(cases_index_fts, rowid, title, short_summary) VALUES ('delete', old.rowid, old.title, old.short_summary);
END;
CREATE TRIGGER IF NOT EXISTS cases_index_au AFTER UPDATE ON cases_index BEGIN
  INSERT INTO cases_index_fts(cases_index_fts, rowid, title, short_summary) VALUES ('delete', old.rowid, old.title, old.short_summary);
  INSERT INTO cases_index_fts(rowid, title, short_summary) VALUES (new.rowid, new.title, new.short_summary);
END;

CREATE TABLE IF NOT EXISTS uyap_notifications (
  id TEXT PRIMARY KEY,
  bildirim_id INTEGER,
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
`;

const openHandles = new Map(); // absolutePath(working) -> better-sqlite3 Database

function openDb(workingPath, schemaSql) {
  const existing = openHandles.get(workingPath);
  if (existing) return existing;

  fs.mkdirSync(path.dirname(workingPath), { recursive: true });
  const db = new Database(workingPath);
  db.pragma('journal_mode = WAL');
  db.exec(schemaSql);
  openHandles.set(workingPath, db);
  return db;
}

function openCaseDb(caseFolderAbsolutePath) {
  const workingPath = path.join(caseFolderAbsolutePath, CASE_WORKING_FILENAME);
  return openDb(workingPath, CASE_SCHEMA_SQL);
}

function openMasterIndexDb(dosyalarRoot) {
  const workingPath = path.join(dosyalarRoot, MASTER_WORKING_FILENAME);
  return openDb(workingPath, MASTER_SCHEMA_SQL);
}

// Aktif yazma sırasında bile tutarlı bir kopya üretir (better-sqlite3'ün
// Online Backup API'si — ham dosya kopyalama DEĞİL, bkz. dosya başındaki not).
// snapshotPath, working dosyayla AYNI klasörde ama nokta İÇERMEYEN bir isim
// olmalı (backupQueue.js'in otomatik yakalaması için — bkz. fileStore.js).
//
// ÖNEMLİ: db.backup() kaynağın journal_mode'unu (working dosya WAL modunda)
// AYNEN kopyalar — doğrulandı, düzeltilmezse anlık görüntü de "wal" modunda
// çıkıyor ve ondan sonra HERHANGİ bir açılışta (Drive yükleme öncesi okuma,
// mobil ince-köprünün better-sqlite3 ile açması, hatta bir `sqlite3` CLI
// incelemesi) kendi -shm/-wal eş dosyalarını üretiyor. Bu hem "tek taşınabilir
// dosya" amacını bozuyor hem de backupQueue.js'in bu eş dosyaları da ayrı
// birer değişiklik sanıp gereksiz yere tekrar tekrar Drive'a yüklemesine yol
// açıyor. Anlık görüntüyü DELETE moduna çevirmek, ondan sonra salt-okunur
// açılışlarda hiç eş dosya üretilmemesini garanti eder.
async function snapshotToPublicFile(db, snapshotPath) {
  const tmpPath = `${snapshotPath}.tmp-${process.pid}-${Date.now()}`;
  await db.backup(tmpPath);
  const tmpDb = new Database(tmpPath);
  tmpDb.pragma('journal_mode = DELETE');
  tmpDb.close();
  fs.renameSync(tmpPath, snapshotPath); // atomik değiştirme — yarım kopya asla görünmez
  // journal_mode = DELETE geçişi kendi -wal/-shm dosyalarını temizler, ama
  // olası bir yarışta arda kalmışsa (örn. önceki bir 'wal' modlu anlık
  // görüntüden miras) burada da temizle — backupQueue.js bunları yanlışlıkla
  // yüklemesin.
  for (const suffix of ['-wal', '-shm']) {
    try { fs.unlinkSync(snapshotPath + suffix); } catch (_) {}
  }
}

function closeAll() {
  for (const db of openHandles.values()) {
    try { db.close(); } catch (_) {}
  }
  openHandles.clear();
}

module.exports = {
  CASE_WORKING_FILENAME,
  CASE_SNAPSHOT_FILENAME,
  MASTER_WORKING_FILENAME,
  MASTER_SNAPSHOT_FILENAME,
  openCaseDb,
  openMasterIndexDb,
  snapshotToPublicFile,
  closeAll,
};
