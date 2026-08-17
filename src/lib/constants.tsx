import { View } from '@/types';
import React from 'react';
export const DS = {
  bg: 'var(--color-bg-base)',
  surface: 'var(--color-surface)',
  text: 'var(--color-text)',
  accent: 'var(--color-accent)',
  accentLight: 'var(--color-accent-light)',
  accentDark: 'var(--color-accent-dark)',
  divider: 'var(--color-divider)',
  neutral100: 'var(--color-neutral-100)',
  neutral200: 'var(--color-neutral-200)',
  neutral800: 'var(--color-neutral-800)',
  ok: 'var(--color-ok)',
};

export const CHAT_SUGGESTIONS = [
  { icon: '📄', label: 'Dilekçe Taslağı Oluştur', desc: 'Dava dosyası seçerek AI ile taslak hazırla' },
  { icon: '🔍', label: 'İçtihat Araştır', desc: 'Yargıtay ve emsal kararlarında arama yap' },
  { icon: '📋', label: 'Belge Analizi', desc: 'Yüklediğin belgeyi analiz et ve özetle' },
  { icon: '⚖️', label: 'Hukuki Değerlendirme', desc: 'Dava stratejisi ve risk analizi al' },
];

export const Icon = {
  grid: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  folder: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" /></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>,
  file: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /></svg>,
  calendar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>,
  copy: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z" /><path d="M3 7.6v12.8c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h9.8" /><path d="M15 2v5h5" /></svg>,
  users: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  msg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>,
  plus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>,
  chevR: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>,
  chevL: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>,
  send: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>,
  spark: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></svg>,
  dl: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>,
  clip: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>,
  moon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>,
  activity: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>,
  settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>,
  cloud: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></svg>,
  star: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>,
  crosshairs: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>,
  zap: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
};

export const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Genel Bakış', icon: Icon.grid },
  { id: 'chat', label: 'Sohbet / Asistan', icon: Icon.msg },

  { id: 'cases', label: 'Dava Dosyaları', icon: Icon.folder },
  { id: 'research', label: 'İçtihat Arama', icon: Icon.search },
  { id: 'drafting', label: 'Dilekçe Hazırlama', icon: Icon.file },
  { id: 'calendar', label: 'Duruşma Takvimi', icon: Icon.calendar },
  { id: 'templates', label: 'Belge Şablonları', icon: Icon.copy },
  { id: 'clients', label: 'Müvekkiller', icon: Icon.users },
  { id: 'settings', label: 'Ayarlar', icon: Icon.settings },
];

export const VIEW_TITLES: Record<View, string> = {
  overview: 'Genel Bakış', cases: 'Dava Dosyaları', research: 'İçtihat Arama',
  drafting: 'Dilekçe Hazırlama', calendar: 'Duruşma Takvimi', templates: 'Belge Şablonları',
  clients: 'Müvekkiller', chat: 'Sohbet / Asistan', settings: 'Ayarlar',
};

export function tagStyle(durum: string) {
  if (durum === 'Aktif') return { background: 'transparent', color: 'var(--color-ok)', border: '1px solid var(--color-ok)' };
  if (durum === 'Kapandı' || durum === 'Pasif') return { background: DS.neutral200, color: DS.neutral800, border: '1px solid ' + DS.divider };
  return { background: 'transparent', color: DS.accent, border: '1px solid ' + DS.accent };
}

export const S = {
  card: { background: DS.surface, padding: '16px', borderRadius: 16, display: 'flex', flexDirection: 'column' as const, gap: 8, border: '1px solid ' + DS.divider, backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.05)' },
  tag: (d: string) => ({ display: 'inline-flex', alignItems: 'center', fontFamily: "'Inter',system-ui,sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', borderRadius: 9999, padding: '3px 10px', ...tagStyle(d) }),
  btn: (primary?: boolean) => ({
    display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, fontSize: 13,
    padding: '8px 16px', border: '1px solid transparent', borderRadius: 12,
    background: primary ? DS.accent : 'transparent',
    color: primary ? '#FFFFFF' : DS.text,
    borderColor: primary ? DS.accent : DS.divider,
    boxShadow: primary ? '0 4px 15px rgba(59, 130, 246, 0.2)' : 'none',
    transition: 'all 0.15s ease'
  } as React.CSSProperties),
  input: { width: '100%', minHeight: 40, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', background: DS.surface, border: '1px solid ' + DS.divider, borderRadius: 12, color: DS.text, outline: 'none', transition: 'border-color 0.15s ease, box-shadow 0.15s ease', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as React.CSSProperties,
  th: { textAlign: 'left' as const, fontFamily: "'Inter',system-ui,sans-serif", fontSize: 11, letterSpacing: '0.03em', textTransform: 'uppercase' as const, opacity: 0.6, padding: '10px 12px', borderBottom: '1px solid ' + DS.divider },
  td: { padding: '10px 12px', borderBottom: '1px solid ' + DS.divider, fontSize: 13 },
};

export const chipStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 10px',
  background: DS.surface, border: '1px solid ' + DS.divider, maxWidth: 220, borderRadius: 8, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)'
};

export const chipTextStyle: React.CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://apexapi.ayris.tech/api/';

export const COURT_OPTIONS: { value: string; label: string }[] = [
  { value: 'YARGITAYKARARI', label: 'Yargıtay' },
  { value: 'DANISTAYKARAR', label: 'Danıştay' },
  { value: 'AYM', label: 'Anayasa Mahkemesi (AYM)' },
  { value: 'ISTINAFHUKUK', label: 'İstinaf (BAM)' },
  { value: 'YERELHUKUK', label: 'Yerel Mahkemeler' },
  { value: 'UYUSMAZLIK', label: 'Uyuşmazlık Mahkemesi' },
  { value: 'SAYISTAY', label: 'Sayıştay' },
  { value: 'KYB', label: 'Kanun Yararına Bozma (KYB)' },
  { value: 'GIB', label: 'GİB Vergi Özelgeleri' },
  { value: 'KIK', label: 'Kamu İhale Kurulu (KİK)' },
  { value: 'KVKK', label: 'KVKK (Kişisel Veriler)' },
  { value: 'REKABET', label: 'Rekabet Kurumu' },
  { value: 'BDDK', label: 'BDDK (Bankacılık)' },
  { value: 'BTK', label: 'BTK (Bilgi Teknolojileri)' },
  { value: 'SIGORTATAHKIM', label: 'Sigorta Tahkim Komisyonu' },
  { value: 'EMSALLER', label: 'UYAP Emsal Kararlar' },
];

export const draftingEmitter = new EventTarget();

export const globalDraftingState = {
  inProgress: false,
  lastResult: null as { content: string; draftId: string; tur: string; caseId: string; usedTemplate: boolean } | null,
  error: null as string | null,
  startTime: 0
};

export const EVENT_TYPE_LABELS: Record<string, string> = { hearing: 'Duruşma', meeting: 'Görüşme', deadline: 'Süre' };

export const MONTH_NAMES_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export const DAY_NAMES_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const SUPPORT_CATEGORIES: { value: string; label: string }[] = [
  { value: 'hata', label: 'Hata Bildirimi' },
  { value: 'geri_bildirim', label: 'Geri Bildirim' },
  { value: 'soru', label: 'Soru' },
  { value: 'diger', label: 'Diğer' },
];

