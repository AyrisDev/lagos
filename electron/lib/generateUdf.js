const AdmZip = require('adm-zip');

/**
 * Parses markdown text (specifically **bold**) and converts it into
 * UYAP UDF XML layout (plain text with global character offsets).
 */
function parseMarkdown(text) {
  let cleanText = '';
  let elements = [];
  
  const paragraphs = text.split('\n');
  let globalOffset = 0;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    
    if (p === '') {
      // Empty line
      elements.push(`<paragraph><content startOffset="${globalOffset}" length="1" /></paragraph>`);
      cleanText += '\n';
      globalOffset += 1;
      continue;
    }

    let pElements = [];
    let pText = '';
    
    // Split by ** to find bold sections
    const parts = p.split('**');
    let isBold = false;
    
    for (let part of parts) {
      if (part.length > 0) {
        pElements.push(`<content startOffset="${globalOffset}" length="${part.length}" ${isBold ? 'bold="true" ' : ''}/>`);
        pText += part;
        globalOffset += part.length;
      }
      isBold = !isBold;
    }
    
    // Add newline character to clean text
    const isLastParagraph = (i === paragraphs.length - 1);
    if (!isLastParagraph) {
      cleanText += pText + '\n';
      pElements.push(`<content startOffset="${globalOffset}" length="1" />`);
      globalOffset += 1;
    } else {
      cleanText += pText;
    }
    
    elements.push(`<paragraph>${pElements.join('')}</paragraph>`);
  }
  
  return { cleanText, elementsStr: elements.join('\n') };
}

/**
 * Generates a .udf file (ZIP archive containing content.xml) from markdown.
 */
function generateUdf(markdownText) {
  // Make sure we handle CRLF -> LF to not mess up offset counts
  const normalizedText = markdownText.replace(/\r\n/g, '\n');
  const { cleanText, elementsStr } = parseMarkdown(normalizedText);
  
  const xml = `<?xml version="1.0" encoding="UTF-8" ?> 
<template format_id="1.8" >
<content><![CDATA[${cleanText}]]></content><properties><pageFormat mediaSizeName="1" leftMargin="42.5" rightMargin="42.5" topMargin="42.5" bottomMargin="42.5" paperOrientation="1" headerFOffset="20.0" footerFOffset="20.0" /></properties>
<elements resolver="hvl-default" >
${elementsStr}
</elements>
<styles><style name="default" description="Geçerli" family="Times New Roman" size="12" bold="false" italic="false" /><style name="hvl-default" family="Times New Roman" size="12" description="Gövde" /></styles>
</template>`;

  const zip = new AdmZip();
  zip.addFile('content.xml', Buffer.from(xml, 'utf8'));
  return zip.toBuffer();
}

/**
 * Injects markdown text into an existing UDF template buffer.
 * Replaces [İÇERİK] marker and shifts XML offsets accordingly.
 */
function cloneUdfTemplate(templateBuffer, markdownText) {
  const zip = new AdmZip(templateBuffer);
  const entry = zip.getEntry('content.xml');
  if (!entry) throw new Error('Geçersiz UDF: content.xml bulunamadı');
  
  const originalXml = entry.getData().toString('utf8');
  
  const cdataMatch = originalXml.match(/<content><!\[CDATA\[([\s\S]*?)\]\]><\/content>/);
  if (!cdataMatch) throw new Error('UDF formatı desteklenmiyor: CDATA bulunamadı');
  
  let cdata = cdataMatch[1];
  
  let marker = '[İÇERİK]';
  let idx = cdata.indexOf(marker);
  if (idx === -1) {
    marker = '[ICERIK]';
    idx = cdata.indexOf(marker);
  }
  
  // Markdown parser'ı çağır
  const normalizedText = markdownText.replace(/\r\n/g, '\n');
  const { cleanText, elementsStr } = parseMarkdown(normalizedText);
  let shiftedElementsStr = elementsStr;
  
  let newCdata;
  let diff;
  
  if (idx === -1) {
    // Bulunamazsa en sona ekle
    marker = '';
    const prefix = cdata.endsWith('\n') ? '\n' : '\n\n';
    const textToAdd = prefix + cleanText;
    const actualIdx = cdata.length + prefix.length;
    
    shiftedElementsStr = elementsStr.replace(/startOffset="(\d+)"/g, (match, p1) => {
      return `startOffset="${parseInt(p1, 10) + actualIdx}"`;
    });
    
    newCdata = cdata + textToAdd;
    diff = textToAdd.length;
    idx = cdata.length;
  } else {
    // İşaretçi yerine koy
    shiftedElementsStr = elementsStr.replace(/startOffset="(\d+)"/g, (match, p1) => {
      return `startOffset="${parseInt(p1, 10) + idx}"`;
    });
    
    newCdata = cdata.substring(0, idx) + cleanText + cdata.substring(idx + marker.length);
    diff = cleanText.length - marker.length;
  }
  
  // Elements işlemleri
  const elementsMatch = originalXml.match(/<elements([^>]*)>([\s\S]*?)<\/elements>/);
  if (!elementsMatch) throw new Error('UDF formatı desteklenmiyor: elements bulunamadı');
  const elementsAttrs = elementsMatch[1];
  const originalElements = elementsMatch[2];
  
  const paragraphRegex = /<paragraph[^>]*>[\s\S]*?<\/paragraph>/g;
  let finalElements = '';
  let injected = false;
  
  let match;
  while ((match = paragraphRegex.exec(originalElements)) !== null) {
    let pStr = match[0];
    
    let maxOffset = -1;
    let minOffset = 999999999;
    const contentRegex = /<content[^>]+startOffset="(\d+)"[^>]*>/g;
    let cMatch;
    while ((cMatch = contentRegex.exec(pStr)) !== null) {
      const o = parseInt(cMatch[1], 10);
      if (o > maxOffset) maxOffset = o;
      if (o < minOffset) minOffset = o;
    }
    
    let newPStr = pStr.replace(/<content([^>]+)>/g, (m, attrs) => {
      const startMatch = attrs.match(/startOffset="(\d+)"/);
      const lengthMatch = attrs.match(/length="(\d+)"/);
      if (!startMatch || !lengthMatch) return m;
      
      const start = parseInt(startMatch[1], 10);
      const len = parseInt(lengthMatch[1], 10);
      
      if (start + len <= idx) return m;
      if (start >= idx + marker.length) {
        return `<content${attrs.replace(/startOffset="\d+"/, `startOffset="${start + diff}"`)}>`;
      }
      return ''; // overlap marker
    });
    
    if (!injected && (minOffset >= idx || maxOffset >= idx)) {
      finalElements += shiftedElementsStr + '\n';
      injected = true;
    }
    
    if (newPStr.includes('<content')) {
      finalElements += newPStr + '\n';
    }
  }
  
  if (!injected) {
    finalElements += shiftedElementsStr + '\n';
  }
  
  // Yeni XML'i oluştur
  const newXml = originalXml
    .replace(/<content><!\[CDATA\[[\s\S]*?\]\]><\/content>/, `<content><![CDATA[${newCdata}]]></content>`)
    .replace(/<elements[^>]*>[\s\S]*?<\/elements>/, `<elements${elementsAttrs}>\n${finalElements}</elements>`);
    
  zip.updateFile('content.xml', Buffer.from(newXml, 'utf8'));
  return zip.toBuffer();
}

module.exports = { generateUdf, cloneUdfTemplate };
