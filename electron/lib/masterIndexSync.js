// Merkezi özet index'ini (_ayris-master-index.sqlite) Drive'a yükler.
// backupQueue.js'in genel dava-klasörü taraması "dosyalar/" kökünü bir dava
// klasörü sanıp yanlış kategorize eder (bkz. backupQueue.js satır 161-162,
// caseTitle eşleşmezse 'dosyasiz' düşer) — bu yüzden kök seviyesindeki bu TEK
// dosya için ayrı, basit bir yükleyici: aynı backend uç noktasını
// (/google-drive/upload) rezerve bir case_title ("_master_index") ile kullanır,
// backupQueue.js'e hiç dokunmadan.
const fs = require('fs');
const crypto = require('crypto');

const DEBOUNCE_MS = 8000;
const MASTER_CASE_TITLE = '_master_index';
const MASTER_LOCAL_PATH = '_ayris-master-index.sqlite';

let _getAuthToken = () => null;
let _backendUrl = '';
let timer = null;
let uploading = false;
let pendingPath = null;

function init({ getAuthToken, backendUrl }) {
  _getAuthToken = getAuthToken || _getAuthToken;
  _backendUrl = backendUrl || _backendUrl;
}

function scheduleUpload(absoluteSnapshotPath) {
  pendingPath = absoluteSnapshotPath;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    doUpload().catch((e) => console.error('[masterIndexSync] Yükleme hatası:', e.message));
  }, DEBOUNCE_MS);
}

async function doUpload() {
  if (uploading || !pendingPath) return;
  const token = _getAuthToken();
  if (!token) return; // oturum yok — bir sonraki değişiklikte tekrar denenir

  uploading = true;
  const targetPath = pendingPath;
  try {
    const buffer = fs.readFileSync(targetPath);
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const formData = new FormData();
    formData.append('file', new Blob([buffer]), 'ozet-index.sqlite');
    formData.append('case_title', MASTER_CASE_TITLE);
    formData.append('local_path', MASTER_LOCAL_PATH);
    formData.append('local_modified_at', new Date().toISOString());
    formData.append('sha256', sha256);

    const res = await fetch(`${_backendUrl}/google-drive/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    console.log('[masterIndexSync] Merkezi index Drive\'a yüklendi.');
  } finally {
    uploading = false;
  }
}

module.exports = { init, scheduleUpload };
