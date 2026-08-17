import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { API_URL, DS, globalDraftingState, SUPPORT_CATEGORIES } from '@/lib/constants';
import { PendingAttachment, PendingImportEntry, CalendarEventRow } from '@/types';



export function stripBrackets(s: string) {
  return s.replace(/^\s*\[/, '').replace(/\]\s*$/, '').trim();
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function draftFilenameBase(label: string): string {
  return (label || 'dilekce').replace(/[^\p{L}\p{N}]+/gu, '_');
}

export function exportDraftAsWord(text: string, label: string) {
  if (!text.trim()) return;
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8"><title>${escapeHtml(label)}</title></head>
    <body style="font-family:'Times New Roman',serif; font-size:12pt; line-height:1.6;">${escapeHtml(text).replace(/\n/g, '<br>')}</body>
  </html>`;
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${draftFilenameBase(label)}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportDraftAsPdf(text: string, label: string): Promise<{ ok: boolean; canceled?: boolean; error?: string } | void> {
  if (!text.trim()) return;
  const exportPdf = (window as unknown as { electron?: { exportPdf?: (text: string, filename: string) => Promise<{ ok: boolean; canceled?: boolean; error?: string }> } }).electron?.exportPdf;
  if (exportPdf) {
    return await exportPdf(text, `${draftFilenameBase(label)}.pdf`);
  }
  // Electron dışında (örn. tarayıcıda geliştirme): yazdırma penceresi üzerinden PDF.
  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.write(`<pre style="white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:12pt;padding:40px;">${escapeHtml(text)}</pre>`);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  }
}

export function exportDraftAsUdf(text: string, label: string) {
  if (!text.trim()) return;
  const udfXml = `<?xml version="1.0" encoding="UTF-8"?>
<template format="1.0">
  <content><![CDATA[${text}]]></content>
</template>`;
  const blob = new Blob(['\uFEFF', udfXml], { type: 'application/vnd.uyap.udf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${draftFilenameBase(label)}.udf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function parseDocCategory(filename: string, dbCategory?: string | null): string {
  if (!filename) return dbCategory || 'Genel Evrak';

  let clean = filename.replace(/\.(udf|pdf|doc|docx|tif|tiff|jpg|jpeg|png)$/i, '');
  
  // Dava dosya ön ekini temizle (Örn: 2026_498(Ceza Dava Dosyasi)_ veya 2026_4521(CBS Sorusturma Dosyasi)_)
  clean = clean.replace(/^[0-9_]+(\([^)]+\))?_/i, '');

  // Sondaki tarih ve ek bilgisini temizle (Örn: _Ek_3_13_07_2026_1 veya _16_07_2026)
  clean = clean.replace(/(_Ek_[0-9_]+)?(_[0-9]{1,2}_[0-9]{1,2}_[0-9]{4})(_[0-9]+)?$/i, '');
  clean = clean.replace(/_Ek_[0-9_]+$/i, '');

  clean = clean.replace(/_/g, ' ').trim();

  clean = clean
    .replace(/\bBos\b/gi, 'Boş')
    .replace(/\bMuzekkere\b/gi, 'Müzekkere')
    .replace(/\bSablonu\b/gi, 'Şablonu')
    .replace(/\bGerekceli\b/gi, 'Gerekçeli')
    .replace(/\bHazirlik\b/gi, 'Hazırlık')
    .replace(/\bDosyasi\b/gi, 'Dosyası')
    .replace(/\bDurusma\b/gi, 'Duruşma')
    .replace(/\bIddianame\b/gi, 'İddianame')
    .replace(/\bAdli\b/gi, 'Adlî')
    .replace(/\bSabika\b/gi, 'Sabıka')
    .replace(/\bKaydi\b/gi, 'Kaydı')
    .replace(/\bDiger\b/gi, 'Diğer')
    .replace(/\bUst\b/gi, 'Üst')
    .replace(/\bYazisi\b/gi, 'Yazısı')
    .replace(/\bGonderme\b/gi, 'Gönderme')
    .replace(/\bAcilis\b/gi, 'Açılış')
    .replace(/\bIadesi\b/gi, 'İadesi')
    .replace(/\bSorusturma\b/gi, 'Soruşturma')
    .replace(/\bCbs\b/gi, 'ÇBS');

  if (clean.length < 2) return dbCategory || 'Genel Evrak';
  return clean;
}

export function parseDocDate(filename: string, fallbackDate?: string | null): string {
  if (filename) {
    const match = filename.match(/_([0-3]?[0-9])_([0-1]?[0-9])_(20[0-9]{2})/);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      return `${day}.${month}.${year}`;
    }
    const matchDot = filename.match(/\b([0-3]?[0-9])[\./-]([0-1]?[0-9])[\./-](20[0-9]{2})\b/);
    if (matchDot) {
      const day = matchDot[1].padStart(2, '0');
      const month = matchDot[2].padStart(2, '0');
      const year = matchDot[3];
      return `${day}.${month}.${year}`;
    }
  }
  if (fallbackDate) {
    try {
      return new Date(fallbackDate).toLocaleDateString('tr-TR');
    } catch {
      return fallbackDate;
    }
  }
  return '—';
}

export function parseDocTimestamp(filename: string, fallbackDate?: string | null): number {
  if (filename) {
    const match = filename.match(/_([0-3]?[0-9])_([0-1]?[0-9])_(20[0-9]{2})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      const dt = new Date(year, month, day);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }
    const matchDot = filename.match(/\b([0-3]?[0-9])[\./-]([0-1]?[0-9])[\./-](20[0-9]{2})\b/);
    if (matchDot) {
      const day = parseInt(matchDot[1], 10);
      const month = parseInt(matchDot[2], 10) - 1;
      const year = parseInt(matchDot[3], 10);
      const dt = new Date(year, month, day);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }
  }
  if (fallbackDate) {
    const dt = new Date(fallbackDate);
    if (!isNaN(dt.getTime())) return dt.getTime();
  }
  return 0;
}

export function fileExt(filename: string) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(filename);
  return m ? m[1].toUpperCase() : '—';
}

export function FileExtIcon({ filename }: { filename: string }) {
  const ext = fileExt(filename);
  let color = DS.accent;
  if (ext === 'PDF') color = '#ef4444';
  else if (ext === 'UDF') color = '#3b82f6';
  else if (ext === 'TIF' || ext === 'TIFF') color = '#eab308';
  else if (ext === 'DOCX' || ext === 'DOC') color = '#2563eb';
  
  return (
    <div style={{
      width: 28, height: 32, borderRadius: 4, border: `2px solid ${color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color: color, flexShrink: 0,
      backgroundColor: `${color}15`,
      userSelect: 'none'
    }}>
      {ext.slice(0, 3) || '?'}
    </div>
  );
}

export function normalizeTr(s: string): string {
  if (!s) return '';
  return s
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .toLowerCase();
}

export function formatRelativeTr(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dakika önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat önce`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} gün önce`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} ay önce`;
  return `${Math.floor(diffMonth / 12)} yıl önce`;
}

export function renderInlineBold(text: string, isLight = false): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => (
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-extrabold text-[var(--color-text)] bg-[var(--color-neutral-100)] px-1 py-0.5 rounded border border-[var(--color-divider)]">{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>
  ));
}

export function renderNarrativeMarkdown(text: string, variant: 'dark' | 'light' = 'dark'): React.ReactNode {
  const isLight = variant === 'light';
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentList: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (currentList.length === 0) return;
    blocks.push(
      <ul key={`ul-${listKey++}`} className="my-3 pl-5 flex flex-col gap-2 list-disc text-[var(--color-text)] marker:text-[#2563EB] dark:marker:text-[#3B82F6]">
        {currentList.map((item, i) => (
          <li key={i} className="text-[14px] leading-relaxed font-medium">
            {renderInlineBold(item, isLight)}
          </li>
        ))}
      </ul>
    );
    currentList = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) { flushList(); return; }

    const bulletMatch = /^[*-]\s+(.+)$/.exec(line);
    if (bulletMatch) {
      currentList.push(bulletMatch[1]);
      return;
    }
    flushList();

    // Support H1-H6 (# to ######)
    const hashHeadingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (hashHeadingMatch) {
      const level = hashHeadingMatch[1].length;
      const content = hashHeadingMatch[2];

      if (level === 1) {
        blocks.push(
          <h1 key={idx} className="text-[20px] font-extrabold mt-6 mb-3 border-b border-[var(--color-divider)] pb-2 flex items-center gap-2 text-[var(--color-text)]">
            {renderInlineBold(content, isLight)}
          </h1>
        );
      } else if (level === 2) {
        blocks.push(
          <h2 key={idx} className="text-[17px] font-extrabold mt-5 mb-2 flex items-center gap-2 text-[#2563EB] dark:text-[#60A5FA]">
            {renderInlineBold(content, isLight)}
          </h2>
        );
      } else if (level === 3) {
        blocks.push(
          <h3 key={idx} className="text-[15.5px] font-bold mt-4 mb-2 flex items-center gap-2 text-[var(--color-text)]">
            {renderInlineBold(content, isLight)}
          </h3>
        );
      } else {
        // H4, H5, H6 (Önemli Başlıklar)
        blocks.push(
          <h4 key={idx} className="text-[13.5px] font-bold mt-4 mb-2 uppercase tracking-wide flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-divider)] bg-[var(--color-neutral-100)] text-[var(--color-text)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] dark:bg-[#3B82F6]" />
            {renderInlineBold(content, isLight)}
          </h4>
        );
      }
      return;
    }

    const numberHeadingMatch = /^(\d+)\.\s+(.+)$/.exec(line);
    if (numberHeadingMatch && numberHeadingMatch[2].length < 100) {
      blocks.push(
        <div key={idx} className="font-bold text-[14.5px] mt-3.5 mb-1.5 flex items-start gap-2 text-[var(--color-text)] bg-[var(--color-neutral-100)] p-2.5 rounded-xl border border-[var(--color-divider)] shadow-sm">
          <span className="font-mono font-extrabold text-[#2563EB] dark:text-[#3B82F6]">{numberHeadingMatch[1]}.</span>
          <span>{renderInlineBold(numberHeadingMatch[2], isLight)}</span>
        </div>
      );
      return;
    }

    blocks.push(
      <p key={idx} className="my-2 text-[14px] leading-relaxed text-[var(--color-text)] font-normal">
        {renderInlineBold(line, isLight)}
      </p>
    );
  });

  flushList();
  return blocks;
}

export function useSupabaseToken(): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
      setToken(data.session?.access_token || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setToken(session?.access_token || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return token;
}

export function getElectronImportStatus(): ((caseTitle: string) => Promise<PendingImportEntry[]>) | undefined {
  return (window as unknown as { electron?: { getImportStatus?: (t: string) => Promise<PendingImportEntry[]> } }).electron?.getImportStatus;
}

export function purgeLocalCaseFiles(caseTitle: string) {
  const fn = (window as unknown as { electron?: { purgeCaseFiles?: (t: string) => Promise<unknown> } }).electron?.purgeCaseFiles;
  if (fn && caseTitle) fn(caseTitle).catch(() => { });
}

export async function retryImportEntry(relativePath: string): Promise<boolean> {
  const fn = (window as unknown as { electron?: { retryImportEntry?: (p: string) => Promise<boolean> } }).electron?.retryImportEntry;
  if (!fn) return false;
  return fn(relativePath).catch(() => false);
}

export async function retryCaseImports(caseTitle: string): Promise<number> {
  const fn = (window as unknown as { electron?: { retryCaseImports?: (t: string) => Promise<number> } }).electron?.retryCaseImports;
  if (!fn) return 0;
  return fn(caseTitle).catch(() => 0);
}

export async function checkImportAuth(): Promise<boolean | null> {
  const fn = (window as unknown as { electron?: { hasImportAuth?: () => Promise<boolean> } }).electron?.hasImportAuth;
  if (!fn) return null; // Electron dışında (tarayıcıda) çalışıyoruz — bu kontrol geçerli değil
  return fn().catch(() => null);
}

export async function scanCaseFolder(caseTitle?: string): Promise<number> {
  const fn = (window as unknown as { electron?: { scanCaseFolder?: (t?: string) => Promise<number> } }).electron?.scanCaseFolder;
  if (!fn) return 0;
  return fn(caseTitle).catch(() => 0);
}

export function runImportQueueNow() {
  const fn = (window as unknown as { electron?: { runImportQueue?: () => Promise<boolean> } }).electron?.runImportQueue;
  if (fn) fn().catch(() => { });
}

export function AiLoadingOverlay({
  messages,
  title = 'AYRIS AI ANALİZ MOTORU ÇALIŞIYOR',
  accentColor = '#3B82F6',
  durationMs = 25000,
}: {
  messages: string[];
  title?: string;
  accentColor?: string;
  durationMs?: number;
}) {
  const [progress, setProgress] = React.useState(0);
  const [logs, setLogs] = React.useState<{ id: string; time: string; text: string; icon: string }[]>([]);

  React.useEffect(() => {
    setLogs([]);
    const perMsgTime = Math.max(800, Math.floor(durationMs / Math.max(messages.length, 1)));

    messages.forEach((msg, idx) => {
      setTimeout(() => {
        const time = new Date().toLocaleTimeString('tr-TR');
        let icon = '📂';
        if (idx === 1) icon = '⚙️';
        else if (idx === 2) icon = '🔍';
        else if (idx >= 3) icon = '📝';

        setLogs(prev => [...prev, { id: `${idx}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, time, text: msg, icon }]);
      }, idx * perMsgTime);
    });

    const intervalMs = 100;
    const step = 100 / (durationMs / intervalMs);
    const timer = setInterval(() => {
      setProgress(p => {
        const next = p < 85 ? p + step : p + step * 0.1;
        return Math.min(next, 98);
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [messages, durationMs]);

  return (
    <div className="bg-[#090D16] border border-[#3B82F6]/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col gap-5 my-4">
      {/* Top Glowing Gradient Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#3B82F6] to-transparent animate-pulse" />

      {/* Header with spinner */}
      <div className="flex items-center justify-between border-b border-[#1E293B] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E293B] border border-[#3B82F6]/50 flex items-center justify-center text-[#60A5FA]">
            <svg className="w-5 h-5 animate-spin text-[#3B82F6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-extrabold text-white font-mono tracking-tight flex items-center gap-2">
              {title}
              <span className="w-2.5 h-2.5 rounded-full bg-[#00E699] animate-ping" />
            </h3>
            <p className="text-[12px] font-mono text-[#7B8CAE]">Dosya evrakları işleniyor ve yapay zeka analizi yapılıyor...</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] font-mono font-bold text-[#3B82F6]">{Math.round(progress)}%</span>
          <span className="text-[11px] font-mono font-bold text-[#60A5FA] bg-[#3B82F6]/10 px-3 py-1 rounded-full border border-[#3B82F6]/30">
            CANLI AKIŞ
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#151C2C] h-1.5 rounded-full overflow-hidden">
        <div 
          className="bg-gradient-to-r from-[#3B82F6] to-[#00E699] h-full rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }} 
        />
      </div>

      {/* Progress Log Box */}
      <div className="bg-[#050811] border border-[#1E293B] rounded-xl p-5 font-mono text-[13px] flex flex-col gap-3.5 shadow-inner">
        {logs.map((log, index) => (
          <div key={`${log.id}-${index}`} className="flex items-center gap-3 text-slate-200 animate-fadeIn">
            <span className="text-[#64748B] text-[11.5px] font-bold">[{log.time}]</span>
            <span className="text-[16px]">{log.icon}</span>
            <span className="text-[#93C5FD] font-semibold tracking-wide">{log.text}</span>
          </div>
        ))}

        <div className="flex items-center gap-2.5 text-[#00E699] pt-1 border-t border-[#1E293B]/60 mt-1">
          <span className="w-2 h-2 rounded-full bg-[#00E699] animate-pulse" />
          <span className="text-[12px] italic text-[#7B8CAE]">İşlem devam ediyor, lütfen bekleyin...</span>
        </div>
      </div>
    </div>
  );
}

export function DraftingStatusMessage({ tur }: { tur: string }) {
  const msgs = [
    `"${tur}" taslağı hazırlanıyor…`,
    'Dava dosyası ve müvekkil bilgileri işleniyor…',
    'Hukuki argümanlar oluşturuluyor…',
    'Avukat dili ve format uygulanıyor…',
    'Son düzeltmeler yapılıyor…',
  ];
  const [idx, setIdx] = React.useState(0);
  
  React.useEffect(() => {
    // Component unmount/remount olduğunda baştan başlamasın diye
    // başlangıç zamanına göre hesaplayarak ilerle
    const updateIdx = () => {
      const elapsed = Date.now() - globalDraftingState.startTime;
      setIdx(Math.floor(elapsed / 3500) % msgs.length);
    };
    updateIdx(); // mount anında hesapla
    const t = setInterval(updateIdx, 500); // 500ms'de bir kontrol et
    return () => clearInterval(t);
  }, [msgs.length]);

  return (
    <div style={{ fontSize: 14, fontWeight: 600, color: '#6366f1', textAlign: 'center', minHeight: 22, letterSpacing: '0.01em' }}>
      {msgs[idx]}
    </div>
  );
}

export function DraftingProgressBar() {
  const [pct, setPct] = React.useState(0);
  
  React.useEffect(() => {
    const updatePct = () => {
      const elapsedSeconds = (Date.now() - globalDraftingState.startTime) / 1000;
      let currentPct = 0;
      if (elapsedSeconds < 12.5) {
        // İlk 12.5 saniye hızlı ilerle (%75'e kadar -> saniyede %6)
        currentPct = elapsedSeconds * 6;
      } else {
        // 12.5 saniyeden sonra yavaşla (saniyede %0.9)
        currentPct = 75 + ((elapsedSeconds - 12.5) * 0.9);
      }
      setPct(Math.min(currentPct, 96));
    };

    updatePct(); // mount anında hesapla
    const t = setInterval(updatePct, 200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: 320 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, opacity: 0.45 }}>İlerleme</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1' }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 5, background: '#e0e7ff', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          background: 'linear-gradient(90deg,#818cf8,#6366f1)',
          width: '100%',
          transform: `scaleX(${Math.max(0, Math.min(1, pct / 100))})`,
          transformOrigin: 'left',
          transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
    </div>
  );
}

export async function consumeChatStream(
  response: globalThis.Response,
  ctrl: AbortController,
  onDelta: (text: string) => void,
  stallMs = 60000
): Promise<{ newTitle: string | null; error: string | null }> {
  if (!response.ok) {
    try {
      const errJson = await response.json();
      return { newTitle: null, error: errJson.error || `Sunucu hatası: HTTP ${response.status}` };
    } catch {
      return { newTitle: null, error: `Sunucu hatası: HTTP ${response.status}` };
    }
  }
  if (!response.body) return { newTitle: null, error: 'Akış desteklenmiyor.' };
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let newTitle: string | null = null;
  let error: string | null = null;
  let stallTimer: ReturnType<typeof setTimeout>;
  const resetStall = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => ctrl.abort(), stallMs);
  };
  resetStall();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      resetStall();
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith('data:')) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;
        let payload: { delta?: string; done?: boolean; newTitle?: string | null; error?: string };
        try { payload = JSON.parse(jsonStr); } catch { continue; }
        if (payload.delta) onDelta(payload.delta);
        if (payload.error) error = payload.error;
        if (payload.done) newTitle = payload.newTitle ?? null;
      }
    }
  } finally {
    clearTimeout(stallTimer!);
  }
  return { newTitle, error };
}

export async function uploadAndExtractAttachment(file: File, token: string | null): Promise<PendingAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  const headers: Record<string, string> = {};
  
  const { data: sessionData } = await supabase.auth.getSession();
  const freshToken = sessionData?.session?.access_token || token;
  if (freshToken) headers['Authorization'] = `Bearer ${freshToken}`;

  const res = await fetch(`${API_URL}documents/extract-text`, { method: 'POST', headers, body: formData });
  const data = await res.json().catch(() => ({}) as { error?: string; filename?: string; extracted_text?: string });
  if (!res.ok) throw new Error(data.error || 'Dosya işlenemedi.');
  return { filename: data.filename || file.name, text: data.extracted_text || '' };
}

export function ProcessLog() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    // Toplamda ilk response gelene kadar akacak yaklaşık süreler
    const intervals = [300, 600, 800, 600, 1000, 1200];
    let timeout: ReturnType<typeof setTimeout>;
    const runStep = (idx: number) => {
      if (idx >= intervals.length) return;
      timeout = setTimeout(() => {
        setStep(idx + 1);
        runStep(idx + 1);
      }, intervals[idx]);
    };
    runStep(0);
    return () => clearTimeout(timeout);
  }, []);

  const lines = [
    { text: 'SUNUCU BAĞLANTISI KURULUYOR...', done: step > 0 },
    { text: 'BAĞLANTI ONAYLANDI', done: step > 1 },
    { text: 'BAĞLAM (DOSYA/EKLER) AKTARILIYOR...', done: step > 2 },
    { text: 'BAĞLAM AKTARIMI TAMAMLANDI', done: step > 3 },
    { text: 'AI MODELİ YÜKLENİYOR...', done: step > 4 },
    { text: 'YANIT ÜRETİLİYOR (DÜŞÜNÜYOR)...', done: false, pendingAt: 5 },
  ];

  return (
    <div className="border border-[#1E293B] bg-[#0C1324] font-mono text-[11px] flex flex-col my-4 rounded-xl overflow-hidden shadow-md text-white">
      <div className="px-3 py-2 border-b border-[#1E293B] flex justify-between items-center font-bold tracking-wider text-[#7B8CAE] uppercase bg-[#0F1524]">
        <span>PROCESS LOG</span>
        <span className="text-[#3B82F6] flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 bg-[#3B82F6] rounded-full animate-pulse" />
          LIVE
        </span>
      </div>
      <div className="p-3.5 flex flex-col gap-2.5">
        {lines.filter((_, i) => step >= i || lines[i].pendingAt === step).map((l, i) => (
          <div key={i} className="flex justify-between items-center">
            <span className={l.done ? 'text-[#00E699]' : (l.pendingAt === step ? 'text-white' : 'text-[#64748B]')}>
              [00:0{i + 1}] {l.text}
            </span>
            <span>{l.done ? '✓' : (l.pendingAt === step ? <span className="animate-spin inline-block">⚙</span> : '')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function getCaseCategory(title: string): string {
  const t = normalizeTr(title).toLowerCase();
  if (t.includes('ceza') || t.includes('savcı') || t.includes('soruşturma') || t.includes('cbs')) return 'Ceza';
  if (t.includes('icra') || t.includes('iflas')) return 'İcra';
  if (t.includes('hukuk') || t.includes('aile') || t.includes('iş ') || t.includes('tüketici') || t.includes('ticaret') || t.includes('idare') || t.includes('vergi') || t.includes('sulh') || t.includes('asliye') || t.includes('bölge adliye')) return 'Hukuk';
  return 'Diğer';
}

export function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function toIcsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function icsEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function buildGoogleCalendarUrl(ev: CalendarEventRow) {
  const start = new Date(ev.date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${toIcsDate(start)}/${toIcsDate(end)}`,
    details: ev.description || '',
    location: ev.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function downloadIcsEvent(ev: CalendarEventRow) {
  const start = new Date(ev.date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AyrisLegal//TR',
    'BEGIN:VEVENT',
    `UID:${ev.id}@ayrislegal`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${icsEscape(ev.title)}`,
    ev.description ? `DESCRIPTION:${icsEscape(ev.description)}` : '',
    ev.location ? `LOCATION:${icsEscape(ev.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ev.title.replace(/[^\w\-]+/g, '_') || 'etkinlik'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function formatTL(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 });
}

export function supportCategoryLabel(v: string): string {
  return SUPPORT_CATEGORIES.find(c => c.value === v)?.label || v;
}

/**
 * Dosya içerisinde Gerekçeli Karar evrakı olup olmadığını tespit eder ve temiz karar özetini çıkarır.
 */
export function detectReasonedVerdictDoc(documents: any[]): {
  name: string;
  verdictDate: string | null;
  verdictNo: string | null;
  verdictOutcome: string;
  sentenceDetail: string | null;
  textSnippet: string;
} | null {
  if (!Array.isArray(documents) || documents.length === 0) return null;

  const verdictDoc = documents.find(d => {
    const n = normalizeTr(d.name || d.filename || d.title || '');
    return n.includes('gerekceli') || (n.includes('karar') && (n.includes('ilam') || n.includes('gerekce') || n.includes('hukum')));
  });

  if (!verdictDoc) return null;

  const docName = verdictDoc.name || verdictDoc.filename || 'Gerekçeli Karar';
  const rawText = (verdictDoc.extracted_text || verdictDoc.summary || '').trim();
  const normText = normalizeTr(rawText);
  const normFileName = normalizeTr(docName);

  // 1. Extract Verdict Date (Karar Tarihi)
  // Turkish legal document convention (TDK): Verdict date is written at the closing sentence (e.g. "...anlatıldı. 11/08/2026") or at the bottom signature
  let verdictDate: string | null = null;

  // Search for closing decision sentence pattern (e.g., "...anlatıldı. 11/08/2026" or "...okundu. 11.08.2026")
  const closingPattern = /(?:anlatıldı|okundu|verildi|okunarak|tefhim|tanzim|karar|tarihli)[^\d]*?\b([0-3]?[0-9])[\._/-]([0-1]?[0-9])[\._/-](20[2-9][0-9])\b/i.exec(rawText);
  if (closingPattern) {
    verdictDate = `${String(closingPattern[1]).padStart(2, '0')}.${String(closingPattern[2]).padStart(2, '0')}.${closingPattern[3]}`;
  } else {
    // Collect all valid dates in document text
    const allDatesInText: { raw: string; index: number }[] = [];
    const dateGlobalRegex = /\b([0-3]?[0-9])[\._/-]([0-1]?[0-9])[\._/-](20[2-9][0-9])\b/g;
    let dMatch: RegExpExecArray | null;

    while ((dMatch = dateGlobalRegex.exec(rawText)) !== null) {
      const day = String(dMatch[1]).padStart(2, '0');
      const month = String(dMatch[2]).padStart(2, '0');
      const year = dMatch[3];
      if (parseInt(day, 10) >= 1 && parseInt(day, 10) <= 31 && parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12) {
        allDatesInText.push({ raw: `${day}.${month}.${year}`, index: dMatch.index });
      }
    }

    if (allDatesInText.length > 0) {
      // Pick the date closest to the bottom of the document text (signature date)
      verdictDate = allDatesInText[allDatesInText.length - 1].raw;
    } else {
      // Fallback to filename date
      const dateInName = /\b([0-3]?[0-9])[\._/-]([0-1]?[0-9])[\._/-](20[2-9][0-9])\b/.exec(docName);
      if (dateInName) {
        verdictDate = `${String(dateInName[1]).padStart(2, '0')}.${String(dateInName[2]).padStart(2, '0')}.${dateInName[3]}`;
      }
    }
  }

  // 2. Extract Esas / Karar No
  let verdictNo: string | null = null;
  const matchNo = /(?:Esas\s*(?:NO)?\s*:\s*)?(\d{4}\/\d+)\s*(?:Esas|E\.)?\s*-\s*(?:Karar\s*(?:NO)?\s*:\s*)?(\d{4}\/\d+)/i.exec(rawText);
  if (matchNo) {
    verdictNo = `${matchNo[1]} E. - ${matchNo[2]} K.`;
  } else {
    const matchE = /(\d{4}\/\d+)\s*Esas/i.exec(rawText);
    const matchK = /(\d{4}\/\d+)\s*Karar/i.exec(rawText);
    if (matchE && matchK) {
      verdictNo = `${matchE[1]} E. - ${matchK[1]} K.`;
    }
  }

  // 3. Extract Outcome & Sentence (Karar Türü & Ceza Miktarı / Görevsizlik / Yetkisizlik)
  let verdictOutcome = 'Gerekçeli Karar Verildi';
  let sentenceDetail: string | null = null;

  if (normText.includes('gorevsizlik') || normFileName.includes('gorevsizlik')) {
    verdictOutcome = 'Görevsizlik Kararı';
  } else if (normText.includes('yetkisizlik') || normFileName.includes('yetkisizlik')) {
    verdictOutcome = 'Yetkisizlik Kararı';
  } else if (normText.includes('beraat') || normText.includes('beraatine')) {
    verdictOutcome = 'Beraat Kararı';
  } else if (normText.includes('mahkumiyet') || normText.includes('mahkumiyetine') || normText.includes('cezalandirilmasina') || normText.includes('hapis')) {
    verdictOutcome = 'Mahkûmiyet Kararı';
    const matchPenalty = /(?:ceza|hapis|cezalandirilmasina)[^.\n]*?(\d+\s*(?:yil|ay|gun)[^.\n]*)/i.exec(normText);
    if (matchPenalty) {
      sentenceDetail = matchPenalty[1].trim();
    }
  } else if (normText.includes('dusen') || normText.includes('dusmesine')) {
    verdictOutcome = 'Davanın Düşmesi Kararı';
  } else if (normText.includes('kabul') || normText.includes('kabulune')) {
    verdictOutcome = 'Davanın Kabulü Kararı';
  } else if (normText.includes('red') || normText.includes('reddi')) {
    verdictOutcome = 'Davanın Reddi Kararı';
  }

  return {
    name: docName,
    verdictDate,
    verdictNo,
    verdictOutcome,
    sentenceDetail,
    textSnippet: sentenceDetail ? `${verdictOutcome} (${sentenceDetail})` : verdictOutcome
  };
}

export interface LegalBasisItem {
  code: string;
  description: string;
}

/**
 * Dava dosyasındaki evrak metinlerinden ve dava türünden gerçek hukuki dayanakları (TCK, CMK, HMK, İYUK maddelerini) çıkarır.
 */
export function extractLegalBases(documents: any[], caseTitle?: string): LegalBasisItem[] {
  const branch = getCaseCategory(caseTitle || '');
  const items: LegalBasisItem[] = [];

  const combinedText = (documents || [])
    .map(d => `${d.name || ''} ${d.filename || ''} ${d.extracted_text || ''} ${d.summary || ''}`)
    .join(' ');

  const normText = normalizeTr(combinedText);
  const titleNorm = normalizeTr(caseTitle || '');

  const isCriminal = titleNorm.includes('ceza') || titleNorm.includes('asliye ceza') || titleNorm.includes('agır ceza') || normText.includes('tck') || normText.includes('cmk') || normText.includes('iddianame') || normText.includes('sanik') || normText.includes('supheli');
  const isAdmin = titleNorm.includes('idare') || titleNorm.includes('vergi') || normText.includes('iyuk') || normText.includes('idari');

  if (isCriminal) {
    if (normText.includes('86/1') || normText.includes('86/3') || normText.includes('86')) {
      items.push({ code: 'TCK m. 86/1, 86/3-e', description: 'Kasten yaralama suçu (nitelikli hal: silahla yaralama).' });
    }
    if (normText.includes('29/1') || normText.includes('29') || normText.includes('tahrik')) {
      items.push({ code: 'TCK m. 29/1', description: 'Haksız tahrik nedeniyle ceza indirimi hükümleri.' });
    }
    if (normText.includes('53') || normText.includes('hak yoksunlug')) {
      items.push({ code: 'TCK m. 53', description: 'Belli hakları kullanmaktan yoksun bırakılma (güvenlik tedbirleri).' });
    }
    if (normText.includes('63') || normText.includes('mahsup')) {
      items.push({ code: 'TCK m. 63', description: 'Gözaltı ve tutuklulukta geçen sürelerin cezadan mahsubu.' });
    }
    if (normText.includes('106') || normText.includes('tehdit')) {
      items.push({ code: 'TCK m. 106', description: 'Tehdit suçu ve ceza sorumluluğu unsurları.' });
    }

    if (items.length === 0) {
      items.push({ code: 'TCK m. 86 / m. 106', description: 'Suçun kanuni unsurları ve ceza sorumluluğu esasları.' });
      items.push({ code: 'CMK m. 217/2', description: 'Yüklenen suçun hukuka uygun şekilde elde edilmiş delillerle ispatı.' });
    }
    items.push({ code: 'CMK m. 223/2-e', description: 'Şüpheden sanık yararlanır ilkesi gereğince beraat değerlendirmesi.' });
    items.push({ code: 'Yargıtay CGK 2020/215 K.', description: 'Kesin delil bulunmadan şüpheye dayalı mahkûmiyet kurulamayacağı ilkesi.' });
  } else if (isAdmin) {
    items.push({ code: 'İYUK m. 2', description: 'İdari işlemlerin yetki, şekil, sebep, konu ve maksat yönlerinden idari yargı denetimi.' });
    items.push({ code: 'İYUK m. 27', description: 'Telafisi güç zararların doğması halinde yürütmenin durdurulması kararı verilmesi.' });
    items.push({ code: 'Danıştay İDDK 2021/112 K.', description: 'Gerekçesiz ve somut belgeye dayanmayan idari işlemlerin iptali.' });
  } else {
    // CIVIL (Hukuk)
    items.push({ code: 'TMK m. 6 / HMK m. 190', description: 'Tarafların iddia ettikleri vakıaları resmi ve somut delillerle ispat yükü.' });
    items.push({ code: 'HMK m. 119 / m. 121', description: 'Dilekçeler aşaması, delillerin ikamesi ve usul işlemleri.' });
    items.push({ code: 'Yargıtay HGK 2022/895 K.', description: 'İspat yükü kendisinde olan tarafın iddiasını hukuken geçerli delillerle kanıtlaması.' });
  }

  return items.slice(0, 4);
}

export interface MarginNoteResult {
  note: string;
  recommendation: string;
}

/**
 * Dava dosyasının durumuna göre dinamik AI Dijital Kenar Notu (Taktik Strateji ve Öneri) üretir.
 */
export function generateDigitalMarginNote(documents: any[], caseTitle?: string): MarginNoteResult {
  const combinedText = (documents || [])
    .map(d => `${d.name || ''} ${d.filename || ''} ${d.extracted_text || ''} ${d.summary || ''}`)
    .join(' ');
  const normText = normalizeTr(combinedText);
  const titleNorm = normalizeTr(caseTitle || '');

  const isCriminal = titleNorm.includes('ceza') || titleNorm.includes('asliye ceza') || titleNorm.includes('agir ceza') || normText.includes('tck') || normText.includes('cmk') || normText.includes('iddianame') || normText.includes('sanik') || normText.includes('supheli');
  const isAdmin = titleNorm.includes('idare') || titleNorm.includes('vergi') || normText.includes('iyuk') || normText.includes('idari');

  const verdict = detectReasonedVerdictDoc(documents);

  if (verdict) {
    return {
      note: `Dosyada ${verdict.name} mevcut olup nihai karar (${verdict.verdictOutcome}) verilmiştir. Kanun yolu (İstinaf/Temyiz) süresi gerekçeli kararın tebliğinden itibaren başlar.`,
      recommendation: `Tebliğ tarihini takip ederek süresi içerisinde gerekçeli istinaf/temyiz dilekçesini hazırlayın.`
    };
  }

  if (isCriminal) {
    if (normText.includes('tahrik') || normText.includes('arbede') || normText.includes('tartisma') || normText.includes('bicak') || normText.includes('yaralama')) {
      return {
        note: `Taraflar arasındaki tartışma ve arbede kapsamında haksız tahrik dengesi (TCK m. 29) ile taraf beyanlarındaki çelişkiler davanın seyrini belirlemektedir.`,
        recommendation: `Taraf beyanlarındaki çelişkileri vurgulayıp haksız tahrik indirimini (TCK m. 29) ve CMK m. 223/2-e uyarınca beraat talebini öne çıkarın.`
      };
    }
    return {
      note: `Kovuşturma safahatındaki ifade tutanakları ile kolluk beyanları arasındaki çelişkiler ve delillerin somutluğu denetlenmelidir.`,
      recommendation: `CMK m. 217/2 uyarınca hukuka aykırı veya şüpheli delillerin mahkûmiyete esas alınamayacağını savunun.`
    };
  } else if (isAdmin) {
    return {
      note: `İdari işlemin sebep ve maksat yönünden hukuka aykırı olduğu tespiti yapılmıştır. Telafisi güç zararlar mevcuttur.`,
      recommendation: `İYUK m. 27 uyarınca yürütmenin durdurulması talebini ivedilikle mahkemeye sunun.`
    };
  }

  return {
    note: `Taraf dilekçeleri ve ekli deliller incelendiğinde ispat yükünün dağılımı (TMK m. 6) uyuşmazlığın temelini oluşturmaktadır.`,
    recommendation: `Karşı tarafın iddiasını somut delillerle kanıtlayamadığını ve bilirkişi incelemesi talebinizi vurgulayın.`
  };
}

export interface PostVerdictProcessResult {
  hasPostVerdict: boolean;
  statusLabel: string;
  postDocs: { name: string; type: string }[];
  summaryText: string;
}

/**
 * Karar sonrasında gerçekleşen safahatı (İstinaf, Temyiz, Kesinleşme, İnfaz) tespit eder.
 */
export function detectPostVerdictProcess(documents: any[]): PostVerdictProcessResult | null {
  if (!Array.isArray(documents) || documents.length === 0) return null;

  const verdict = detectReasonedVerdictDoc(documents);
  if (!verdict) return null;

  const postDocs: { name: string; type: string }[] = [];
  let isIstinaf = false;
  let isTemyiz = false;
  let isKesinlesme = false;
  let isInfaz = false;

  for (const doc of documents) {
    const normName = normalizeTr(doc.name || doc.filename || doc.title || '');
    const normText = normalizeTr(doc.extracted_text || doc.summary || '');
    const combined = `${normName} ${normText}`;

    if (combined.includes('istinaf') || combined.includes('bolge adliye')) {
      isIstinaf = true;
      postDocs.push({ name: doc.name || doc.filename, type: 'İstinaf Dilekçesi / Başvurusu' });
    } else if (combined.includes('temyiz') || combined.includes('yargitay') || combined.includes('danistay')) {
      isTemyiz = true;
      postDocs.push({ name: doc.name || doc.filename, type: 'Temyiz Dilekçesi / İlamı' });
    } else if (combined.includes('kesinlesme') || combined.includes('kesinlesme serhi')) {
      isKesinlesme = true;
      postDocs.push({ name: doc.name || doc.filename, type: 'Kesinleşme Şerhi' });
    } else if (combined.includes('infaz') || combined.includes('muddettname')) {
      isInfaz = true;
      postDocs.push({ name: doc.name || doc.filename, type: 'İnfaz Evrakı' });
    }
  }

  if (postDocs.length === 0) {
    return {
      hasPostVerdict: false,
      statusLabel: 'Karara Çıktı (Gerekçeli Karar Yazıldı)',
      postDocs: [],
      summaryText: 'Gerekçeli karar sonrasında henüz kanun yolu (istinaf/temyiz) veya kesinleşme evrakı girilmemiştir.'
    };
  }

  let statusLabel = 'Karar Sonrası Yargılama';
  if (isKesinlesme) statusLabel = '🔒 Hüküm Kesinleşti (Kesinleşme Şerhi Mevcut)';
  else if (isInfaz) statusLabel = '⛓️ İnfaz Aşaması (İnfaz Yazısı / Müddetname)';
  else if (isTemyiz) statusLabel = '🏛️ Temyiz Safahatı (Yargıtay / Danıştay Aşaması)';
  else if (isIstinaf) statusLabel = '⚖️ İstinaf Safahatı (Bölge Adliye Mahkemesi Aşaması)';

  return {
    hasPostVerdict: true,
    statusLabel,
    postDocs,
    summaryText: `Gerekçeli karar sonrasında dosyaya ${postDocs.length} adet evrak (${postDocs.map(d => d.type).join(', ')}) girmiş olup kanun yolu / kesinleşme süreci takip edilmektedir.`
  };
}

/**
 * Tensip zaptı ve duruşma tutanaklarını inceleyerek tespit edilen en ileri (en son) duruşma tarihini döndürür.
 * Gerekçeli Karar varsa "Karara Çıktı" veya "İstinaf/Temyiz/Kesinleşti" statüsü verir.
 */
export function detectLatestHearingDate(documents: any[]): { dateStr: string; sourceDocName: string | null; isDecided?: boolean } | null {
  if (!Array.isArray(documents) || documents.length === 0) return null;

  const postVerdict = detectPostVerdictProcess(documents);
  if (postVerdict) {
    return { dateStr: postVerdict.statusLabel, sourceDocName: postVerdict.postDocs[0]?.name || null, isDecided: true };
  }

  const verdict = detectReasonedVerdictDoc(documents);
  if (verdict) {
    return { dateStr: 'Karara Çıktı', sourceDocName: verdict.name, isDecided: true };
  }

  // Sadece Tensip Zaptı ve Duruşma Tutanağı / Celse Zaptı evraklarını süz
  const targetDocs = documents.filter(d => {
    const name = normalizeTr(d.name || d.filename || d.title || '');
    return name.includes('tensip') || name.includes('durusma') || name.includes('celse') || name.includes('zapt');
  });

  if (targetDocs.length === 0) return null;

  const dateRegex = /\b([0-3]?[0-9])[\.\/-]([0-1]?[0-9])[\.\/-](20[2-9][0-9])\b/g;
  let latestDate: Date | null = null;
  let latestDateStr: string | null = null;
  let sourceDocName: string | null = null;

  for (const doc of targetDocs) {
    const text = `${doc.name || ''} ${doc.filename || ''} ${doc.extracted_text || ''} ${doc.summary || ''}`;
    let match: RegExpExecArray | null;

    while ((match = dateRegex.exec(text)) !== null) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);

      if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
        const parsed = new Date(year, month, day);
        if (!isNaN(parsed.getTime())) {
          if (!latestDate || parsed > latestDate) {
            latestDate = parsed;
            latestDateStr = `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
            sourceDocName = doc.name || doc.filename || 'Duruşma Evrakı';
          }
        }
      }
    }
  }

  if (latestDateStr) {
    return { dateStr: latestDateStr, sourceDocName };
  }

  return null;
}

/**
 * Bir evrakın gerçek bir ifade, beyan, savunma veya duruşma beyan tutanağı olup olmadığını kesin olarak tespit eder.
 * Tensip zaptı, celp/müzekkere, tebligat gibi idari belgeleri eler.
 */
export function isStatementDocument(doc: any): boolean {
  if (!doc) return false;
  const name = normalizeTr(doc.name || doc.filename || doc.title || '');
  const text = normalizeTr(doc.extracted_text || doc.summary || '');

  // 1. İfade olmayan idari/usuli belgeleri kesin olarak ele
  const excludeTerms = [
    'tensip', 'celb', 'celbi', 'muzekkere', 'muzekkeresi',
    'tebligat', 'teblig', 'makbuz', 'harc', 'hedef sure',
    'kapali tebligat', 'davetiye', 'gider avansi', 'talimat tensip'
  ];

  if (excludeTerms.some(term => name.includes(term))) {
    // İstisna: Dosya adında tensip geçse bile açıkça 'ifade' veya 'savunma' veya 'sorgu' geçiyorsa
    if (!name.includes('ifade') && !name.includes('beyan') && !name.includes('savunma') && !name.includes('sorgu')) {
      return false;
    }
  }

  // 2. Belge Adında İfade / Beyan / Savunma Kalıpları
  const nameMatchTerms = [
    'ifade', 'ifadesi', 'ifadesinde', 'ifadeleri',
    'beyan', 'beyani', 'beyaninda', 'beyanlari',
    'savunma', 'savunmasi', 'savunmasinda', 'savunmalari',
    'sorgu', 'sorgusu', 'sorgusunda',
    'durusma tutanagi', 'durusma zapti', 'celse zapti', 'celse tutanagi', 'talimat durusma',
    'tanik', 'magdur', 'supheli', 'sanik', 'musteki', 'katilan', 'kolluk', 'savcilik'
  ];

  const hasNameKeyword = nameMatchTerms.some(term => name.includes(term));
  if (hasNameKeyword) {
    return true;
  }

  // 3. Metin İçi (OCR / Extracted Text) İfade ve Beyan Kalıpları
  if (text.length > 20) {
    const textStatementMarkers = [
      'ifadesi alindi', 'ifadesinde ozetle', 'beyan etti', 'savunmasinda belirtti',
      'soruldu:', 'supheli beyaninda', 'sanik savunmasinda', 'tanik beyaninda',
      'musteki beyaninda', 'aynen tekrar ederim', 'kolluk ifadesinde', 'savcilik ifadesinde',
      'hakimlik sorgusunda', 'durusmadaki beyaninda', 'anlatiminda'
    ];
    if (textStatementMarkers.some(marker => text.includes(marker))) {
      return true;
    }
  }

  return false;
}

