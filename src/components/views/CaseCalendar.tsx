import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DS, Icon, CHAT_SUGGESTIONS, NAV_ITEMS, VIEW_TITLES, S, SUPPORT_CATEGORIES, chipStyle, chipTextStyle, COURT_OPTIONS, draftingEmitter, globalDraftingState, EVENT_TYPE_LABELS, MONTH_NAMES_TR, DAY_NAMES_TR, API_URL } from '@/lib/constants';
import { stripBrackets, escapeHtml, draftFilenameBase, exportDraftAsWord, exportDraftAsPdf, formatBytes, fileExt, FileExtIcon, normalizeTr, formatRelativeTr, renderInlineBold, renderNarrativeMarkdown, useSupabaseToken, getElectronImportStatus, purgeLocalCaseFiles, retryImportEntry, retryCaseImports, checkImportAuth, runImportQueueNow, sameDay, toIcsDate, icsEscape, buildGoogleCalendarUrl, downloadIcsEvent, formatTL, str, getCaseCategory, supportCategoryLabel, AiLoadingOverlay, DraftingStatusMessage, DraftingProgressBar, ProcessLog, consumeChatStream, uploadAndExtractAttachment } from '@/lib/utils';
import { Theme, View, CaseSection, SettingsSection, TarafRow, CaseRow, DocumentRow, AnalysisRow, PendingImportEntry, PendingAttachment, CaseEvent, PrecedentResult, DraftTemplateOption, DraftRow, CalendarEventRow, TemplateRow, ClientRow, LedgerRow, CaseOption, ThreadRow, SupportMessageRow, CurrentUser } from '@/types';

export function CaseCalendar({ caseId }: { caseId: string }) {
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('case_events')
        .select('*')
        .eq('case_id', caseId)
        .order('event_date', { ascending: true });
        
      if (active) {
        setLoading(false);
        if (!error && data) {
          setEvents(data);
        }
      }
    })();
    return () => { active = false; };
  }, [caseId]);

  if (loading) return <div style={{ opacity: 0.5, fontSize: 13 }}>Takvim yükleniyor...</div>;

  if (events.length === 0) {
    return (
      <div style={{ opacity: 0.6, fontSize: 14, padding: 24, textAlign: 'center', background: DS.surface, borderRadius: 8 }}>
        Dosyada otomatik tespit edilen bir tarih veya duruşma bulunamadı. Yeni evrak yüklendiğinde tarihler buraya düşecektir.
      </div>
    );
  }

  const now = new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {events.map((ev, i) => {
        const d = new Date(ev.event_date);
        const isPast = d < now;
        const color = ev.event_type === 'hearing' ? '#eab308' : ev.event_type === 'deadline' ? '#ef4444' : '#3b82f6';
        
        return (
          <div key={ev.id} style={{ 
            display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', 
            background: isPast ? DS.surface : `${color}0D`, 
            border: `1px solid ${isPast ? DS.divider : `${color}33`}`,
            borderRadius: 12,
            opacity: isPast ? 0.6 : 1,
            transition: 'all 0.15s ease'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 110 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: isPast ? DS.text : color, fontFamily: 'monospace' }}>{d.toLocaleDateString('tr-TR')}</span>
              {d.getHours() !== 0 || d.getMinutes() !== 0 ? (
                <span style={{ fontSize: 12, opacity: 0.7, fontFamily: 'monospace' }}>{d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
              ) : null}
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: DS.text }}>{ev.title}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
                  padding: '2px 8px', borderRadius: 9999,
                  background: `${color}1A`, color: color, border: `1px solid ${color}40`
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                  {ev.event_type === 'hearing' ? 'Duruşma' : ev.event_type === 'deadline' ? 'Kesin Süre / Son Gün' : 'Genel'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}