const AdmZip = require('adm-zip');

let _officeParserModule = null;
function getOfficeParser() {
  if (_officeParserModule === null) {
    try {
      _officeParserModule = require('officeparser');
    } catch (err) {
      console.warn('[parseUdf] officeparser yüklenemedi:', err.message);
      _officeParserModule = false;
    }
  }
  return _officeParserModule || null;
}

function decodeBufferToText(buf) {
  if (!buf || buf.length === 0) return '';

  // 1. Check for UTF-16 BOM
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.toString('utf16le');
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    return buf.swap16().toString('utf16le');
  }

  // 2. Try UTF-8 first
  const utf8Str = buf.toString('utf8');
  
  // XML içinde ISO-8859-9 veya Windows-1254 varsa iconv-lite veya latin1 kullan
  const encodingMatch = utf8Str.match(/encoding=["']([^"']+)["']/i);
  const enc = encodingMatch ? encodingMatch[1].toLowerCase() : '';

  if (enc.includes('1254') || enc.includes('8859-9') || enc.includes('latin5') || enc.includes('windows')) {
    try {
      const iconv = require('iconv-lite');
      return iconv.decode(buf, 'iso-8859-9');
    } catch (_) {
      return buf.toString('latin1');
    }
  }

  return utf8Str;
}

function cleanXmlTags(xml) {
  if (!xml) return '';
  return xml
    .replace(/<style[\s\S]*?<\/style>/gi, '') // inline CSS style bloklarını temizle
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<[^>]+>/g, ' ') // Tüm XML taglerini boşlukla değiştir
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ') // Boşlukları sadeleştir
    .replace(/\n\s*\n/g, '\n\n') // Fazla boş satırları birleştir
    .trim();
}

function extractUdfTextFromXml(rawXml) {
  if (!rawXml || typeof rawXml !== 'string') return '';
  
  // 1. UYAP CDATA bloklarının Hepsini topla (Birden fazla CDATA olabilir)
  const cdataRegex = /<!\[CDATA\[([\s\S]*?)\]\]>/gi;
  const cdataParts = [];
  let match;
  while ((match = cdataRegex.exec(rawXml)) !== null) {
    if (match[1] && match[1].trim()) {
      cdataParts.push(match[1].trim());
    }
  }

  if (cdataParts.length > 0) {
    const combinedCdata = cdataParts.join('\n\n');
    const cleanCdata = cleanXmlTags(combinedCdata);
    if (cleanCdata.length > 30) {
      return cleanCdata;
    }
  }
  
  // 2. CDATA yoksa veya kısa ise tüm XML etiketlerini temizle
  return cleanXmlTags(rawXml);
}

// UYAP e-imza sarmallı veya ön ekli UDF zip dosyalarını çözebilmek için PK imzasını arar
function getZipFromBuffer(buffer) {
  try {
    return new AdmZip(buffer);
  } catch (e) {
    // PK\x03\x04 imzasını (0x50, 0x4B, 0x03, 0x04) buffer içinde ara
    const pkSignature = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const pkIndex = buffer.indexOf(pkSignature);
    if (pkIndex > 0) {
      try {
        const slicedBuffer = buffer.subarray(pkIndex);
        return new AdmZip(slicedBuffer);
      } catch (_) {}
    }
  }
  return null;
}

async function parseUdf(buffer, ctx = {}) {
  // 1) UDF bir ZIP konteyneri — zipten çıkarıp içerideki XML / PDF / DOCX dosyalarını tara
  const zip = getZipFromBuffer(buffer);
  if (zip) {
    try {
      const entries = zip.getEntries().filter((e) => !e.isDirectory);
      
      // A. XML dosyalarını bul (content.xml, *.xml)
      const xmlEntries = entries.filter((e) => /\.xml$/i.test(e.entryName));
      if (xmlEntries.length > 0) {
        xmlEntries.sort((a, b) => {
          const score = (e) => /content|document|body/i.test(e.entryName) ? 1 : 0;
          return score(b) - score(a) || b.header.size - a.header.size;
        });

        for (const entry of xmlEntries.slice(0, 5)) {
          try {
            const rawXml = decodeBufferToText(entry.getData());
            const txt = extractUdfTextFromXml(rawXml);
            if (txt && txt.trim().length > 20) {
              return txt.trim();
            }
          } catch (e) {
            console.error('[parseUdf] XML parse hatası:', e.message);
          }
        }
      }

      // B. PDF dosyalarını bul (*.pdf) — UYAP'tan indirilen bazı talimat/ek belgeleri gömülü PDF içerir
      const pdfEntries = entries.filter((e) => /\.pdf$/i.test(e.entryName));
      const officeParser = getOfficeParser();
      if (officeParser) {
        for (const pdfEntry of pdfEntries) {
          try {
            const pdfBuffer = pdfEntry.getData();
            const res = await officeParser.parseOffice(pdfBuffer, { fileType: 'pdf' });
            const pdfText = typeof res === 'string' ? res : (res?.toText ? res.toText() : String(res || ''));
            if (pdfText && pdfText.trim().length > 20) {
              return pdfText.trim();
            }
          } catch (e) {
            console.error('[parseUdf] Gömülü PDF okuma hatası:', e.message);
          }
        }
      }

      // C. Herhangi başka bir doküman dosyası (*.docx, *.doc, *.rtf, *.txt)
      for (const entry of entries) {
        const ext = (entry.entryName.split('.').pop() || '').toLowerCase();
        if (['docx', 'doc', 'rtf', 'txt'].includes(ext)) {
          try {
            const data = entry.getData();
            if (ext === 'txt') {
              const txt = decodeBufferToText(data).trim();
              if (txt.length > 20) return txt;
            } else if (officeParser) {
              const res = await officeParser.parseOffice(data);
              const txt = typeof res === 'string' ? res : (res?.toText ? res.toText() : String(res || ''));
              if (txt && txt.trim().length > 20) return txt.trim();
            }
          } catch (e) {
            console.error('[parseUdf] Arşiv içi doküman okuma hatası:', e.message);
          }
        }
      }
    } catch (zipParseErr) {
      console.log('[parseUdf] ZIP girişi okuma hatası:', zipParseErr.message);
    }
  }

  // 2) ZIP değilse veya ZIP içinden uygun dosya çıkmadıysa: ham metin / düz XML denemesi
  try {
    const asText = decodeBufferToText(buffer);
    if (asText && asText.trim().length > 20) {
      const stripped = extractUdfTextFromXml(asText);
      if (stripped && stripped.trim().length > 20) {
        return stripped.trim();
      }
    }
  } catch (_) {}

  return null;
}

module.exports = { parseUdf, extractUdfTextFromXml };
