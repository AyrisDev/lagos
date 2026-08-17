// Evrakları uygulamanın kendi yerel "dosyalar" klasöründe saklar.
// Ham dosya baytları asla ağa çıkmaz — bu klasör sadece kullanıcının cihazında var.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const TR_ASCII_MAP = {
  'ç': 'c', 'Ç': 'C', 'ğ': 'g', 'Ğ': 'G',
  'ı': 'i', 'İ': 'I', 'ö': 'o', 'Ö': 'O',
  'ş': 's', 'Ş': 'S', 'ü': 'u', 'Ü': 'U'
};

function turkishToAscii(s) {
  return String(s || '').replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_ASCII_MAP[ch] || ch);
}

function sanitizeName(name) {
  return (
    turkishToAscii(name)
      .replace(/[\\/:*?"<>|\r\n\t]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .trim()
      .slice(0, 120) || 'dosya'
  );
}

function getDosyalarRoot() {
  const root = path.join(app.getPath('userData'), 'dosyalar');
  fs.mkdirSync(root, { recursive: true });
  return root;
}

// Uzaktan (backend/Drive) gelen bir "relativePath" değerinin, gerçekten yerel
// "dosyalar" kökünün İÇİNDE kaldığını doğrular — path traversal'a karşı (örn.
// "../../.ssh/id_rsa" veya mutlak bir yol) son bir savunma katmanı. Bu proje
// içindeki normal akışlarda (tarama, import) relativePath zaten sanitizeName'den
// geçmiş güvenli parçalardan kuruluyor, ama restoreQueue.js gibi backend'den
// (dolayısıyla veritabanından) okunan bir string'i doğrudan fs yoluna çeviren
// yerlerde bu ekstra doğrulama şart.
function resolveSafeLocalPath(root, relativePath) {
  if (typeof relativePath !== 'string' || !relativePath) return null;
  if (path.isAbsolute(relativePath)) return null; // mutlak yol / UNC path reddedilir
  const resolvedRoot = path.resolve(root) + path.sep;
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(resolvedRoot)) return null; // ../ ile kökten çıkma girişimi
  return resolved;
}

// caseTitle: UYAP'tan gelen dava başlığı ("2023/1079 Çal Cumhuriyet Başsavcılığı" gibi)
// record: { name, dateStr, ext, base64 }
// Döner: { absolutePath, relativePath, sanitizedCaseTitle }
function saveEvrak(caseTitle, caseCategory, record) {
  const root = getDosyalarRoot();
  const caseFolder = sanitizeName(caseTitle || 'dosyasiz');
  const catFolder = caseCategory ? sanitizeName(caseCategory) : '';
  const dir = catFolder ? path.join(root, catFolder, caseFolder) : path.join(root, caseFolder);
  fs.mkdirSync(dir, { recursive: true });

  const ext = sanitizeName(record.ext || 'pdf').toLowerCase();
  const baseName = sanitizeName(record.name || 'evrak');
  const dateStr = sanitizeName(record.dateStr || 'tarihsiz');
  let filename = `${baseName}_${dateStr}.${ext}`;
  let absolutePath = path.join(dir, filename);

  // Aynı isimde dosya varsa üzerine yazmak yerine numaralandır.
  let counter = 1;
  while (fs.existsSync(absolutePath)) {
    filename = `${baseName}_${dateStr}_${counter}.${ext}`;
    absolutePath = path.join(dir, filename);
    counter++;
  }

  const buffer = Buffer.from(record.base64, 'base64');
  fs.writeFileSync(absolutePath, buffer);

  return {
    absolutePath,
    relativePath: catFolder ? path.join(catFolder, caseFolder, filename) : path.join(caseFolder, filename),
    sanitizedCaseTitle: catFolder ? path.join(catFolder, caseFolder) : caseFolder,
    buffer,
  };
}

module.exports = { sanitizeName, getDosyalarRoot, saveEvrak, resolveSafeLocalPath };
