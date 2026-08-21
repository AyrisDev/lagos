// Uzantıya göre dispatch: her formatı düz metne çevirir (AI'nin okuyabileceği hale
// getirir). Görsel/taranmış içerik artık yerel Tesseract yerine self-hosted
// DeepSeek-OCR'a (backend üzerinden, PRD/OCR görüşmelerinde netleştirilen mimari)
// gönderiliyor — hem daha isabetli hem de çok sayfalı TIFF'lerde Tesseract'ın
// sessizce sadece ilk sayfayı okuyup gerisini kaybettiği bug'ı çözüyor (bkz.
// tiffBufferToPngPages). Ofis belgeleri (pdf/docx/vb.) hâlâ tamamen yerelde,
// officeparser ile işleniyor — onlarda görsel/OCR gerekmiyor.
const AdmZip = require('adm-zip');
const UTIF = require('utif2');
const { Worker } = require('worker_threads');
const path = require('path');
const { parseUdf } = require('./parseUdf');

let _officeParserModule = null;
function getOfficeParser() {
  if (_officeParserModule === null) {
    try {
      _officeParserModule = require('officeparser');
    } catch (err) {
      console.warn('[extractText] officeparser yüklenemedi:', err.message);
      _officeParserModule = false;
    }
  }
  return _officeParserModule || null;
}

let _canvasModule = null;
function getCreateCanvas() {
  if (_canvasModule === null) {
    try {
      _canvasModule = require('@napi-rs/canvas');
    } catch (err) {
      console.warn('[extractText] @napi-rs/canvas yüklenemedi:', err.message);
      _canvasModule = false;
    }
  }
  return _canvasModule ? _canvasModule.createCanvas : null;
}

// TIFF ayrı ele alınıyor (çok sayfa + PNG normalize gerekiyor) — burada sadece
// "doğrudan gönderilebilir" tekil görsel formatları kalıyor.
const SIMPLE_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp']);
// officeparser'ın buffer'dan ayrıştırırken kabul ettiği açık fileType ipuçları
// (bkz. SupportedFileType) — 'txt' bu listede yok, düz metin olarak ayrıca ele alınıyor.
const OFFICE_HINT_EXTS = new Set(['pdf', 'docx', 'rtf', 'odt', 'pptx', 'xlsx', 'csv', 'html', 'epub', 'md']);
// Eski ikili Office formatları (doc/xls/ppt): officeparser'ın fileType ipucu listesinde
// yok ama magic-byte otomatik tespiti genelde çalışır — hint vermeden deneriz.
const OFFICE_AUTODETECT_EXTS = new Set(['doc', 'xls', 'ppt']);

const OCR_TIMEOUT_MS = 90_000; // backend'in kendi kuyruğu + 60sn işleme süresine pay bırakıyor

// officeparser@7.x parseOffice() artik duz string degil, bir sonuc objesi
// donduruyor (result.toText() ile duz metne cevriliyor). Eski surumlerle veya
// beklenmedik donuslerle de calissin diye once toText'i dene, olmazsa string'e cast et.
function officeResultToText(result) {
  if (typeof result === 'string') return result;
  if (result && typeof result.toText === 'function') return result.toText();
  return String(result || '');
}

// TIFF, sıkça çok sayfalı geliyor (gerçek UYAP evraklarında 30 sayfaya kadar
// gördük) — her sayfayı (IFD) ayrı bir PNG'ye çeviriyoruz. Eskiden sadece
// ifds[0] okunuyordu, 2. sayfadan itibaren her şey sessizce kayboluyordu.
function tiffBufferToPngPages(buffer) {
  let ifds;
  try {
    ifds = UTIF.decode(buffer);
  } catch (err) {
    console.error('[extractText] UTIF decode hatası:', err.message);
    return [];
  }
  if (!ifds || ifds.length === 0) return [];
  
  const createCanvas = getCreateCanvas();
  if (!createCanvas) {
    console.warn('[extractText] Canvas modülü (@napi-rs/canvas) bulunamadı, TIFF render atlanıyor.');
    return [];
  }

  const pages = [];
  for (const page of ifds) {
    try {
      UTIF.decodeImage(buffer, page);
      const rgba = UTIF.toRGBA8(page);
      const width = Math.round(Number(page.t256?.[0] || page.width || 0));
      const height = Math.round(Number(page.t257?.[0] || page.height || 0));
      if (width <= 0 || height <= 0 || !rgba || rgba.length === 0) continue;

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      const imageData = ctx.createImageData(width, height);
      imageData.data.set(rgba);
      ctx.putImageData(imageData, 0, 0);
      pages.push(canvas.toBuffer('image/png'));
    } catch (err) {
      console.error('[extractText] TIFF sayfa render hatası:', err.message);
    }
  }
  return pages;
}

// officeparser ve pdf-parse kendi pdfjs-dist kopyalarını (sırasıyla 6.1.200 ve
// 5.4.296) taşıyor — hepsi aynı process'te çalışınca pdf.js'in "fake worker"
// kurulumu process genelinde tekil davranıp workerSrc'i görmezden geliyor, yanlış
// worker sürümüyle çakışıp "API version X does not match Worker version Y"
// hatası veriyor (gerçek bir UYAP PDF'inde doğrulandı). Bu yüzden PDF render'ı
// ayrı bir worker_threads iş parçacığında (bkz. pdfRenderWorker.js), tamamen
// bağımsız bir V8 isolate'inde yapılıyor.
function pdfBufferToPngPages(buffer) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'pdfRenderWorker.js'), {
      workerData: { buffer },
    });
    worker.once('message', (msg) => {
      worker.terminate();
      if (msg.ok) resolve(msg.pages);
      else reject(new Error(msg.error));
    });
    worker.once('error', (err) => {
      worker.terminate();
      reject(err);
    });
  });
}

// officeparser bir PDF'ten boş metin döndürdüğünde (taranmış/görsel PDF, metin
// katmanı yok) çağrılır — her sayfayı görsele çevirip aynı DeepSeek-OCR ucundan
// (sıralı, TIFF'teki gibi) geçirir. Hiçbir sayfada gömülü görsel bulunamazsa
// (gerçekten boş/desteklenmeyen bir PDF) hata fırlatır.
async function pdfBufferToOcrText(buffer, ctx) {
  const pages = await pdfBufferToPngPages(buffer);
  const parts = [];
  let anyImage = false;
  for (let i = 0; i < pages.length; i++) {
    if (!pages[i]) continue;
    anyImage = true;
    const text = await ocrImageViaBackend(Buffer.from(pages[i]), ctx);
    if (text) {
      parts.push(pages.length > 1 ? `\n---\n## Sayfa ${i + 1}\n\n${text}` : text);
    }
  }
  if (!anyImage) {
    throw new Error('PDF taranmış bir görsel içermiyor ve metin katmanı da yok (desteklenmeyen içerik).');
  }
  return parts.join('\n');
}

// Self-hosted DeepSeek-OCR'a (backend üzerinden) bir görsel gönderip markdown
// metin alır. ctx: { backendUrl, getAuthToken } — importQueue.js'ten geliyor,
// lisans/güncelleme çağrılarıyla aynı desen (canlı token getter, snapshot değil).
async function ocrImageViaBackend(imageBuffer, ctx) {
  const token = ctx && ctx.getAuthToken ? ctx.getAuthToken() : null;
  if (!token) throw new Error('Oturum bulunamadı — OCR isteği gönderilemedi.');
  if (!ctx.backendUrl) throw new Error('Backend adresi tanımlı değil.');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);
  try {
    const res = await fetch(`${ctx.backendUrl}/documents/ocr-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ image_base64: imageBuffer.toString('base64') }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`OCR isteği başarısız (${res.status}): ${errText}`.trim());
    }
    const data = await res.json();
    return (data.text || '').trim();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function extractFromBuffer(buffer, ext, ctx = {}) {
  const e = String(ext || '').toLowerCase().replace(/^\./, '');

  if (e === 'zip') {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries().filter((en) => !en.isDirectory);
    const parts = [];
    for (const entry of entries) {
      const entryExt = (entry.entryName.split('.').pop() || '').toLowerCase();
      try {
        const text = await extractFromBuffer(entry.getData(), entryExt, ctx);
        if (text && text.trim()) {
          parts.push(`--- ${entry.entryName} ---\n${text.trim()}`);
        }
      } catch (err) {
        console.error(`[extractText] zip içi ${entry.entryName} işlenemedi:`, err.message);
      }
    }
    return parts.join('\n\n');
  }

  if (e === 'udf') {
    const text = await parseUdf(buffer, ctx);
    if (!text) throw new Error('UDF ayrıştırılamadı (desteklenmeyen/bilinmeyen UDF yapısı).');
    return text;
  }

  if (e === 'tiff' || e === 'tif') {
    let pages = [];
    try {
      pages = tiffBufferToPngPages(buffer);
    } catch (err) {
      console.error('[extractText] UTIF tiff sayfalara ayrılamadı:', err.message);
    }

    if (pages && pages.length > 0) {
      const parts = [];
      for (let i = 0; i < pages.length; i++) {
        const text = await ocrImageViaBackend(pages[i], ctx);
        if (text) {
          parts.push(pages.length > 1 ? `\n---\n## Sayfa ${i + 1}\n\n${text}` : text);
        }
      }
      if (parts.length > 0) return parts.join('\n');
    }

    // UTIF ayrıştıramadıysa ham TIFF tamponunu doğrudan backend OCR servisine gönder
    const rawText = await ocrImageViaBackend(buffer, ctx);
    if (rawText && rawText.trim()) return rawText.trim();

    throw new Error('TIFF belgesinden metin çıkarılamadı.');
  }

  if (SIMPLE_IMAGE_EXTS.has(e)) {
    return ocrImageViaBackend(buffer, ctx);
  }

  if (e === 'txt') {
    return buffer.toString('utf8');
  }

  const officeParser = getOfficeParser();

  if (OFFICE_HINT_EXTS.has(e)) {
    if (!officeParser) throw new Error('Ofis belgesi okuma modülü aktif değil.');
    const result = await officeParser.parseOffice(buffer, { fileType: e });
    const text = officeResultToText(result);
    // UYAP'ta taranmış PDF'lerin üzerine genellikle barkod veya e-imza metni (text layer)
    // damgalanır. Bu durumda officeparser sadece o küçük metni okur ve asıl taranmış belge
    // OCR'a girmez. Metin çok kısaysa (örn. 3000 karakterden az), belgenin görsel ağırlıklı
    // olma ihtimaline karşı OCR'ı da deniyoruz.
    if (e === 'pdf' && text.trim().length < 3000) {
      try {
        const ocrText = await pdfBufferToOcrText(buffer, ctx);
        // OCR daha fazla metin çıkarabildiyse (gerçekten taranmış sayfalarsa) onu kullan
        if (ocrText && ocrText.trim().length > text.trim().length) {
          return ocrText;
        }
      } catch (err) {
        // Eğer PDF içinde hiç görsel yoksa (sadece metinse) pdfBufferToOcrText hata fırlatır.
        // Orijinal metin de tamamen boşsa, bu hatayı yukarı fırlat ki süreç başarısız sayılsın.
        if (!text.trim()) throw err;
        // Metin varsa ama resim yoksa, elimizdeki kısa metni dönmeye devam ediyoruz.
      }
    }
    return text;
  }

  if (OFFICE_AUTODETECT_EXTS.has(e)) {
    if (!officeParser) throw new Error('Ofis belgesi okuma modülü aktif değil.');
    const result = await officeParser.parseOffice(buffer);
    return officeResultToText(result);
  }

  throw new Error(`Desteklenmeyen dosya uzantısı: .${e}`);
}

module.exports = { extractFromBuffer };
