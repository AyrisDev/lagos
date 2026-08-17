// UYAP Evrak İndirici eklentisi ile bu uygulama arasındaki köprü. Sadece 127.0.0.1'e
// bağlanır (ağda görünmez) — güvenlik sınırı bu. Eklenti buraya evrak baytlarını
// gönderir; biz yerelde saklayıp yerelde metin çıkarıyoruz, sadece metni backend'e
// iletiyoruz (ham dosya asla ağa çıkmıyor).
const http = require('http');
const { saveEvrak } = require('./fileStore');
const { generateUdf, cloneUdfTemplate } = require('./generateUdf');
const importQueue = require('./importQueue');
const backupQueue = require('./backupQueue');
const restoreQueue = require('./restoreQueue');

const PORT = 4756;
const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://apexapi.ayris.tech/api/').replace(/\/+$/, '');

let server = null;
let getAuthToken = () => null;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const MAX = 60 * 1024 * 1024; // 60MB — tek bir evrak için makul bir üst sınır
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX) {
        reject(new Error('Gövde çok büyük'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  setCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function handleImport(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (e) {
    return sendJson(res, 400, { ok: false, error: 'Geçersiz istek gövdesi.' });
  }

  const { caseTitle, caseCategory, name, dateStr, ext, base64 } = payload || {};
  if (!caseTitle || !name || !ext || !base64) {
    return sendJson(res, 400, { ok: false, error: 'caseTitle, name, ext ve base64 zorunludur.' });
  }

  let saved;
  try {
    saved = saveEvrak(caseTitle, caseCategory, { name, dateStr, ext, base64 });
  } catch (e) {
    console.error('[localServer] Dosya kaydedilemedi:', e);
    return sendJson(res, 500, { ok: false, error: 'Dosya yerel klasöre kaydedilemedi: ' + e.message });
  }

  // /import burada bitiyor: dosya diske yazıldı, eklentiye hemen yanıt dönülüyor.
  // OCR/metin çıkarımı ve backend'e kayıt burada YAPILMIYOR — indirme dalgası
  // bittiğinde (birkaç saniyelik sessizlikten sonra) importQueue kendi kendine
  // devreye giriyor. Böylece indirme hiçbir zaman OCR/backend'i beklemiyor ve
  // eklenti tarafında zaman aşımı riski kalmıyor.
  importQueue.recordImportedFile({
    caseTitle, caseCategory, name, ext,
    relativePath: saved.relativePath,
    absolutePath: saved.absolutePath,
  });

  return sendJson(res, 200, { ok: true, savedTo: saved.absolutePath, queued: true });
}

// Eklenti UYAP'ın "Taraf Bilgileri" sekmesinden yakaladığı davacı/davalı/sanık +
// vekil bilgisini gönderir. Küçük bir JSON, OCR/dosya işi yok — kuyruğa almadan
// doğrudan (tek denemelik, best-effort) backend'e iletiyoruz.
async function handleCaseMeta(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (e) {
    return sendJson(res, 400, { ok: false, error: 'Geçersiz istek gövdesi.' });
  }

  const { caseTitle, taraflar } = payload || {};
  if (!caseTitle || !Array.isArray(taraflar) || taraflar.length === 0) {
    return sendJson(res, 400, { ok: false, error: 'caseTitle ve taraflar zorunludur.' });
  }

  const token = getAuthToken();
  if (!token) {
    return sendJson(res, 200, { ok: false, error: 'Oturum bulunamadı — uygulamada giriş yapılı olduğundan emin olun.' });
  }

  try {
    const backendRes = await fetch(`${BACKEND_URL}/cases/parties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ case_title: caseTitle, parties: taraflar }),
    });
    const data = await backendRes.json().catch(() => ({}));
    if (!backendRes.ok) {
      return sendJson(res, 200, { ok: false, error: data.error || `Backend HTTP ${backendRes.status}` });
    }
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    console.error('[localServer] Taraf bilgisi backend’e gönderilemedi:', e);
    return sendJson(res, 200, { ok: false, error: 'Backend’e ulaşılamadı: ' + e.message });
  }
}

async function handleExportUdf(req, res) {
  let payload;
  try {
    payload = await readJsonBody(req);
  } catch (e) {
    return sendJson(res, 400, { ok: false, error: 'Geçersiz istek gövdesi.' });
  }

  const { text, templateBase64 } = payload || {};
  if (!text) {
    return sendJson(res, 400, { ok: false, error: 'text alanı zorunludur.' });
  }

  try {
    let udfBuffer;
    if (templateBase64) {
      const templateBuffer = Buffer.from(templateBase64, 'base64');
      udfBuffer = cloneUdfTemplate(templateBuffer, text);
    } else {
      udfBuffer = generateUdf(text);
    }
    
    setCors(res);
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="dilekce.udf"',
      'Content-Length': udfBuffer.length
    });
    res.end(udfBuffer);
  } catch (e) {
    console.error('[localServer] UDF oluşturulamadı:', e);
    return sendJson(res, 500, { ok: false, error: 'UDF oluşturulamadı: ' + e.message });
  }
}

function startLocalServer(authTokenGetter) {
  if (server) return server;
  getAuthToken = authTokenGetter || getAuthToken;
  importQueue.init({ getAuthToken: () => getAuthToken(), backendUrl: BACKEND_URL });
  backupQueue.init({ getAuthToken: () => getAuthToken(), backendUrl: BACKEND_URL });
  restoreQueue.init({ getAuthToken: () => getAuthToken(), backendUrl: BACKEND_URL });

  server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      setCors(res);
      res.writeHead(204);
      return res.end();
    }
    if (req.method === 'GET' && req.url === '/health') {
      return sendJson(res, 200, { ok: true, app: 'AyrisLegal' });
    }
    if (req.method === 'POST' && req.url === '/import') {
      return handleImport(req, res);
    }
    if (req.method === 'POST' && req.url === '/case-meta') {
      return handleCaseMeta(req, res);
    }
    if (req.method === 'POST' && req.url === '/export-udf') {
      return handleExportUdf(req, res);
    }
    sendJson(res, 404, { ok: false, error: 'Bulunamadı' });
  });

  server.on('error', (e) => {
    // Port meşgulse (örn. ikinci bir örnek açılmaya çalışıldıysa) sessizce vazgeç —
    // bu kritik bir özellik değil, uygulamanın geri kalanını etkilememeli.
    console.error('[localServer] Sunucu başlatılamadı:', e.message);
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[localServer] UYAP köprüsü http://127.0.0.1:${PORT} adresinde dinliyor`);
  });

  return server;
}

function stopLocalServer() {
  if (server) {
    server.close();
    server = null;
  }
}

module.exports = { startLocalServer, stopLocalServer, PORT };
