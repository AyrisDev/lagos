// Dilekçe Hazırlama'daki "PDF olarak indir" — düz metni gerçek bir PDF'e çevirip
// diske yazar. Electron'un kendi Chromium'unu (offscreen bir pencere + printToPDF)
// kullanıyor, ek bir PDF kütüphanesi gerekmiyor.
const { BrowserWindow, dialog } = require('electron');
const fs = require('fs');

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function exportTextAsPdf(parentWindow, text, defaultFilename) {
  const { canceled, filePath } = await dialog.showSaveDialog(parentWindow, {
    title: 'PDF olarak kaydet',
    defaultPath: defaultFilename || 'dilekce.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { margin: 25mm 20mm; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.7; white-space: pre-wrap; }
  </style></head><body>${escapeHtml(text)}</body></html>`;

  const printWin = new BrowserWindow({ show: false, webPreferences: { offscreen: true } });
  try {
    await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdfBuffer = await printWin.webContents.printToPDF({ printBackground: true });
    fs.writeFileSync(filePath, pdfBuffer);
    return { ok: true, filePath };
  } finally {
    if (!printWin.isDestroyed()) printWin.close();
  }
}

module.exports = { exportTextAsPdf };
