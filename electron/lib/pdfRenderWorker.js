// worker_threads alt iş parçacığında çalışır (extractText.js tarafından spawn
// edilir). pdfjs-dist'i BAĞIMSIZ bir V8 isolate'inde yükler — officeparser ve
// pdf-parse kendi pdfjs-dist kopyalarını (sırasıyla 6.1.200 ve 5.4.296) taşıyor;
// hepsi aynı process'te çalıştığında pdf.js'in "fake worker" kurulumu process
// genelinde tekil davranıp workerSrc'i görmezden gelerek yanlış worker sürümüyle
// çakışıyor ("API version X does not match Worker version Y" — gerçek bir UYAP
// PDF'inde doğrulandı). Ayrı bir worker thread bu çakışmayı kökten ortadan kaldırır.
const { parentPort, workerData } = require('worker_threads');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
const { createCanvas } = require('@napi-rs/canvas');

pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');

const PDF_IMAGE_KIND = { GRAYSCALE_1BPP: 1, RGB_24BPP: 2, RGBA_32BPP: 3 };

// Taranmış (görsel tabanlı) PDF sayfaları UYAP'ta neredeyse her zaman "tüm sayfa
// = tek gömülü görsel" şeklinde geliyor (gerçek dosyada doğrulandı: sayfanın tüm
// içeriği 5 operatörden sadece 1 paintImageXObject). page.render() ile tam sayfa
// composite denemek @napi-rs/canvas ile native segfault'a kadar gidiyordu; bunun
// yerine gömülü görseli doğrudan çıkarıp ham pikseli @napi-rs/canvas'a veriyoruz.
async function pdfPageToImageBuffer(page) {
  const opList = await page.getOperatorList();
  const OPS = pdfjsLib.OPS;
  let bestName = null;
  let bestArea = 0;
  for (let i = 0; i < opList.fnArray.length; i++) {
    if (opList.fnArray[i] !== OPS.paintImageXObject) continue;
    const name = opList.argsArray[i][0];
    const obj = await new Promise((resolve) => page.objs.get(name, resolve));
    const area = (obj?.width || 0) * (obj?.height || 0);
    if (area > bestArea) { bestArea = area; bestName = name; }
  }
  if (!bestName) return null;

  const imgObj = await new Promise((resolve) => page.objs.get(bestName, resolve));
  const { width, height, kind, data: src } = imgObj;
  if (!width || !height || !src) return null;

  const rgba = new Uint8ClampedArray(width * height * 4);
  if (kind === PDF_IMAGE_KIND.RGB_24BPP) {
    for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
      rgba[j] = src[i]; rgba[j + 1] = src[i + 1]; rgba[j + 2] = src[i + 2]; rgba[j + 3] = 255;
    }
  } else if (kind === PDF_IMAGE_KIND.GRAYSCALE_1BPP) {
    for (let i = 0, j = 0; i < src.length; i++, j += 4) {
      rgba[j] = src[i]; rgba[j + 1] = src[i]; rgba[j + 2] = src[i]; rgba[j + 3] = 255;
    }
  } else {
    rgba.set(src.subarray(0, rgba.length));
  }

  const canvas = createCanvas(width, height);
  const canvasCtx = canvas.getContext('2d');
  const imageData = canvasCtx.createImageData(width, height);
  imageData.data.set(rgba);
  canvasCtx.putImageData(imageData, 0, 0);
  return canvas.toBuffer('image/png');
}

(async () => {
  try {
    const path = require('path');
    const data = new Uint8Array(workerData.buffer);
    const standardFontDataUrl = path.join(path.dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts/');
    const pdf = await pdfjsLib.getDocument({ data, standardFontDataUrl }).promise;
    const pages = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const png = await pdfPageToImageBuffer(page);
      pages.push(png); // sayfada gömülü görsel yoksa null — ana thread'de filtrelenir
    }
    parentPort.postMessage({ ok: true, pages });
  } catch (e) {
    parentPort.postMessage({ ok: false, error: (e && e.message) || String(e) });
  }
})();
